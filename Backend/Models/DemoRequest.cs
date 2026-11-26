using System.ComponentModel.DataAnnotations.Schema;

namespace Pirnav.API.Models
{
    [Table("DemoRequests")]
    public class DemoRequest
    {
        public int Id { get; set; }

        public string ReferenceNumber { get; set; } = string.Empty;

        public string ProductId { get; set; } = string.Empty;

        public string ProductName { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Phone { get; set; } = string.Empty;

        public string Company { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public DateTime? PreferredDemoDate { get; set; }

        public string Status { get; set; } = "New";

        public int? AssignedToUserId { get; set; }

        public AdminUser? AssignedToUser { get; set; }

        public DateTime? FollowUpDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<DemoActivity> Activities { get; set; } = new List<DemoActivity>();

        public ICollection<EmailOutbox> OutboxEmails { get; set; } = new List<EmailOutbox>();
    }
}
