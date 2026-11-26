using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Pirnav.API.Models
{
    [Table("DemoActivities")]
    public class DemoActivity
    {
        public int Id { get; set; }

        public int DemoRequestId { get; set; }

        [JsonIgnore]
        public DemoRequest? DemoRequest { get; set; }

        public string ActivityType { get; set; } = string.Empty;

        public string? PreviousStatus { get; set; }

        public string? NewStatus { get; set; }

        public string Notes { get; set; } = string.Empty;

        public int? EmployeeId { get; set; }

        public string? EmployeeName { get; set; }

        public DateTime? FollowUpDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
