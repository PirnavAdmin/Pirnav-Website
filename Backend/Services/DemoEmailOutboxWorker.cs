using Microsoft.EntityFrameworkCore;
using Pirnav.API.Models;

namespace Pirnav.API.Services
{
    public class DemoEmailOutboxWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<DemoEmailOutboxWorker> _logger;
        private readonly IConfiguration _config;

        public DemoEmailOutboxWorker(
            IServiceScopeFactory scopeFactory,
            ILogger<DemoEmailOutboxWorker> logger,
            IConfiguration config)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _config = config;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessPendingBatchAsync(stoppingToken);
                }
                catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
                {
                    _logger.LogError(ex, "DemoEmailOutboxWorker encountered an error while polling EmailOutbox.");
                }

                await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
            }
        }

        public async Task<int> ProcessPendingBatchAsync(CancellationToken cancellationToken = default)
        {
            if (!_config.GetValue("DemoEmailSettings:EnableOutboxDelivery", true))
                return 0;

            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();

            var now = DateTime.UtcNow;
            var batch = await context.EmailOutboxes
                .Where(e =>
                    (e.DeliveryStatus == "Pending" || e.DeliveryStatus == "Failed") &&
                    e.AttemptCount < e.MaxAttempts &&
                    (e.NextRetryAt == null || e.NextRetryAt <= now))
                .OrderBy(e => e.CreatedAt)
                .Take(20)
                .ToListAsync(cancellationToken);

            if (batch.Count == 0)
                return 0;

            var sentCount = 0;
            foreach (var item in batch)
            {
                if (cancellationToken.IsCancellationRequested)
                    break;

                if (string.IsNullOrWhiteSpace(item.RecipientEmail))
                {
                    item.DeliveryStatus = "FailedPermanent";
                    item.LastError = "Recipient email address is empty.";
                    continue;
                }

                item.AttemptCount += 1;
                try
                {
                    var replyToEmail = _config["DemoEmailSettings:CustomerReplyToEmail"];
                    await emailService.SendEmailAsync(
                        item.RecipientEmail,
                        item.Subject,
                        item.HtmlBody,
                        customSenderEmail: item.SenderEmail,
                        customSenderName: item.SenderName,
                        plainTextBody: item.TextBody,
                        replyToEmail: replyToEmail);

                    item.DeliveryStatus = "Sent";
                    item.SentAt = DateTime.UtcNow;
                    item.NextRetryAt = null;
                    item.LastError = null;
                    sentCount++;
                }
                catch (Exception ex)
                {
                    var sanitizedError = $"{ex.GetType().Name}: {ex.Message}";
                    if (sanitizedError.Length > 480)
                        sanitizedError = sanitizedError.Substring(0, 480);

                    item.LastError = sanitizedError;
                    if (item.AttemptCount >= item.MaxAttempts)
                    {
                        item.DeliveryStatus = "FailedPermanent";
                        item.NextRetryAt = null;
                    }
                    else
                    {
                        item.DeliveryStatus = "Failed";
                        item.NextRetryAt = DateTime.UtcNow.AddMinutes(Math.Pow(2, item.AttemptCount));
                    }

                    _logger.LogWarning(
                        "Outbox email {OutboxId} ({EmailType}) attempt {Attempt} failed: {ErrorType}",
                        item.Id,
                        item.EmailType,
                        item.AttemptCount,
                        ex.GetType().Name);
                }
            }

            await context.SaveChangesAsync(cancellationToken);
            return sentCount;
        }
    }
}
