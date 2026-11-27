
using System.Text.RegularExpressions;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Pirnav.API.Models;

namespace Pirnav.API.Services
{
    public class EmailService
    {
        private static readonly Regex CidRegex = new(
            @"cid:(?<id>pirnav-[a-z0-9-]+)",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private readonly AwsSecretService _awsSecretService;
        private readonly ILogger<EmailService> _logger;
        private readonly string _emailAssetsDir;

        public EmailService(
            AwsSecretService awsSecretService,
            ILogger<EmailService> logger,
            IWebHostEnvironment env)
        {
            _awsSecretService = awsSecretService;
            _logger = logger;
            var candidates = new[]
            {
                string.IsNullOrWhiteSpace(env.WebRootPath)
                    ? string.Empty
                    : Path.Combine(env.WebRootPath, "images", "email"),
                Path.Combine(env.ContentRootPath, "wwwroot", "images", "email"),
                Path.Combine(AppContext.BaseDirectory, "wwwroot", "images", "email")
            };
            _emailAssetsDir = candidates.FirstOrDefault(p => !string.IsNullOrWhiteSpace(p) && Directory.Exists(p))
                ?? Path.Combine(env.ContentRootPath, "wwwroot", "images", "email");
        }

        public async Task SendEmailAsync(
            string toEmail,
            string subject,
            string body,
            string? customSenderEmail = null,
            string? customSenderName = null,
            string? customPassword = null,
            string? plainTextBody = null,
            string? replyToEmail = null)
        {
            try
            {
                var smtp = await _awsSecretService.GetSmtpSettingsAsync();

                var fromEmail = string.IsNullOrWhiteSpace(customSenderEmail)
                    ? smtp.EMAIL_SENDER_EMAIL
                    : customSenderEmail.Trim();
                var fromName = string.IsNullOrWhiteSpace(customSenderName)
                    ? smtp.EMAIL_SENDER_NAME
                    : customSenderName.Trim();
                var authEmail = smtp.EMAIL_SENDER_EMAIL;
                var authPassword = string.IsNullOrWhiteSpace(customPassword)
                    ? smtp.EMAIL_PASSWORD
                    : customPassword;
                if (!string.IsNullOrWhiteSpace(customPassword) && !string.IsNullOrWhiteSpace(customSenderEmail))
                {
                    authEmail = fromEmail;
                }

                var message = new MimeMessage();

                var fromDomain = fromEmail.Split('@').LastOrDefault()?.Trim() ?? string.Empty;
                var authDomain = authEmail.Split('@').LastOrDefault()?.Trim() ?? string.Empty;
                if (!string.Equals(fromEmail, authEmail, StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(fromDomain, authDomain, StringComparison.OrdinalIgnoreCase))
                {
                    message.ReplyTo.Add(new MailboxAddress(fromName, fromEmail));
                    fromEmail = authEmail;
                }

                message.From.Add(new MailboxAddress(fromName, fromEmail));
                if (!string.Equals(fromEmail, authEmail, StringComparison.OrdinalIgnoreCase))
                {
                    message.Sender = new MailboxAddress(smtp.EMAIL_SENDER_NAME, authEmail);
                    message.ReplyTo.Add(new MailboxAddress(fromName, fromEmail));
                }
                else if (!string.IsNullOrWhiteSpace(replyToEmail))
                {
                    message.ReplyTo.Add(new MailboxAddress(fromName, replyToEmail.Trim()));
                }

                foreach (var recipient in toEmail.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                {
                    message.To.Add(new MailboxAddress("", recipient));
                }

                message.Subject = subject;

                var bodyBuilder = new BodyBuilder
                {
                    HtmlBody = body
                };
                AttachReferencedCidAssets(bodyBuilder, body);
                if (!string.IsNullOrWhiteSpace(plainTextBody))
                {
                    bodyBuilder.TextBody = plainTextBody;
                }
                message.Body = bodyBuilder.ToMessageBody();

                using var client = new SmtpClient();

                await client.ConnectAsync(
                    smtp.SMTP_SERVER,
                    int.Parse(smtp.SMTP_PORT),
                    SecureSocketOptions.Auto
                );

                await client.AuthenticateAsync(
                    authEmail,
                    authPassword
                );

                await client.SendAsync(message);

                await client.DisconnectAsync(true);

                _logger.LogInformation(
                    "Email delivered to {Recipient} via {SmtpHost} (From={From}, LinkedResources={CidCount})",
                    toEmail,
                    smtp.SMTP_SERVER,
                    fromEmail,
                    bodyBuilder.LinkedResources.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Email sending failed for recipient {Recipient}", toEmail);
                throw;
            }
        }

        public async Task SendEmailWithAttachmentAsync(
            string toEmail,
            string subject,
            string body,
            string filePath)
        {
            try
            {
                var smtp = await _awsSecretService.GetSmtpSettingsAsync();

                var message = new MimeMessage();

                message.From.Add(new MailboxAddress(
                    smtp.EMAIL_SENDER_NAME,
                    smtp.EMAIL_SENDER_EMAIL
                ));

                message.To.Add(new MailboxAddress("", toEmail.Trim()));

                message.Subject = subject;

                var builder = new BodyBuilder
                {
                    HtmlBody = body
                };

                if (File.Exists(filePath))
                {
                    builder.Attachments.Add(filePath);
                }
                else
                {
                    _logger.LogWarning(
                        "Email attachment file not found: {FilePath}",
                        filePath);
                }

                message.Body = builder.ToMessageBody();

                using var client = new SmtpClient();

                await client.ConnectAsync(
                    smtp.SMTP_SERVER,
                    int.Parse(smtp.SMTP_PORT),
                    SecureSocketOptions.Auto
                );

                await client.AuthenticateAsync(
                    smtp.EMAIL_SENDER_EMAIL,
                    smtp.EMAIL_PASSWORD
                );

                await client.SendAsync(message);

                await client.DisconnectAsync(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Attachment email sending failed for recipient {Recipient}",
                    toEmail);

                throw;
            }
        }

        private void AttachReferencedCidAssets(BodyBuilder bodyBuilder, string? htmlBody)
        {
            if (string.IsNullOrWhiteSpace(htmlBody) || !Directory.Exists(_emailAssetsDir))
                return;

            var attached = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (Match match in CidRegex.Matches(htmlBody))
            {
                var cid = match.Groups["id"].Value;
                if (!attached.Add(cid))
                    continue;

                var filePath = Path.Combine(_emailAssetsDir, $"{cid}.png");
                if (!File.Exists(filePath))
                {
                    _logger.LogWarning("Email CID asset not found: {AssetPath}", filePath);
                    continue;
                }

                var resource = bodyBuilder.LinkedResources.Add(filePath);
                resource.ContentId = cid;
                resource.ContentDisposition = new ContentDisposition(ContentDisposition.Inline);
            }
        }
    }
}
