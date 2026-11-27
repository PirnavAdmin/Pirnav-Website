using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Pirnav.API.Models
{
    [Table("EmailOutbox")]
    public class EmailOutbox
    {
        public int Id { get; set; }

        public string EmailType { get; set; } = string.Empty;

        public string RecipientEmail { get; set; } = string.Empty;

        public string SenderEmail { get; set; } = string.Empty;

        public string SenderName { get; set; } = string.Empty;

        public string Subject { get; set; } = string.Empty;

        public string HtmlBody { get; set; } = string.Empty;

        public string TextBody { get; set; } = string.Empty;

        public int? RelatedDemoRequestId { get; set; }

        [JsonIgnore]
        public DemoRequest? RelatedDemoRequest { get; set; }

        public string DeliveryStatus { get; set; } = "Pending";

        public int AttemptCount { get; set; } = 0;

        public int MaxAttempts { get; set; } = 5;

        public string? LastError { get; set; }

        public DateTime? NextRetryAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? SentAt { get; set; }
    }
}
