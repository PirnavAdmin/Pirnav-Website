using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Pirnav.API.Models
{
    [Table("EventActivities")]
    public class EventActivity
    {
        public int Id { get; set; }

        public int EventId { get; set; }

        [JsonIgnore]
        public Event? Event { get; set; }

        public string ActivityType { get; set; } = string.Empty;

        public string Notes { get; set; } = string.Empty;

        public int? EmployeeId { get; set; }

        public string? EmployeeName { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
