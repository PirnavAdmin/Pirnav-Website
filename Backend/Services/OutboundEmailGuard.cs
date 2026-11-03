using Microsoft.Extensions.Caching.Memory;

namespace Pirnav.API.Services
{
    // Limits automatic emails sent to visitor-entered addresses so the
    // public forms can't be used to send bulk mail from our mailbox.
    public class OutboundEmailGuard
    {
        private const int MaxPerRecipientPerHour = 3;
        private const int MaxPerDay = 300;

        private readonly IMemoryCache _cache;
        private readonly ILogger<OutboundEmailGuard> _logger;
        private readonly object _lock = new();

        public OutboundEmailGuard(IMemoryCache cache, ILogger<OutboundEmailGuard> logger)
        {
            _cache = cache;
            _logger = logger;
        }

        // For emails to fixed team addresses (e.g. chatbot leads): only the daily total applies
        public bool TryAllowNotification()
        {
            var dayKey = $"email-guard:day:{DateTime.UtcNow:yyyyMMdd}";

            lock (_lock)
            {
                var dayCount = _cache.Get<int>(dayKey);

                if (dayCount >= MaxPerDay)
                {
                    _logger.LogWarning("Notification email skipped: daily limit of {Limit} reached.", MaxPerDay);
                    return false;
                }

                _cache.Set(dayKey, dayCount + 1, TimeSpan.FromDays(1));
                return true;
            }
        }

        public bool TryAllow(string recipient)
        {
            var recipientKey = $"email-guard:recipient:{recipient.Trim().ToLowerInvariant()}";
            var dayKey = $"email-guard:day:{DateTime.UtcNow:yyyyMMdd}";

            lock (_lock)
            {
                var recipientCount = _cache.Get<int>(recipientKey);
                var dayCount = _cache.Get<int>(dayKey);

                if (recipientCount >= MaxPerRecipientPerHour)
                {
                    _logger.LogWarning("Auto email skipped: too many emails to {Recipient} in the last hour.", recipient);
                    return false;
                }

                if (dayCount >= MaxPerDay)
                {
                    _logger.LogWarning("Auto email skipped: daily limit of {Limit} reached.", MaxPerDay);
                    return false;
                }

                _cache.Set(recipientKey, recipientCount + 1, TimeSpan.FromHours(1));
                _cache.Set(dayKey, dayCount + 1, TimeSpan.FromDays(1));

                return true;
            }
        }
    }
}
