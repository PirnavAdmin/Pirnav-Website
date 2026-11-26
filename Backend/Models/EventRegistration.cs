using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Pirnav.API.Models
{
    [Table("EventRegistrations")]
    public class EventRegistration
    {
        public int Id { get; set; }

        public int EventId { get; set; }

        [JsonIgnore]
        public Event? Event { get; set; }

        public string ReferenceNumber { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Phone { get; set; } = string.Empty;

        public string Company { get; set; } = string.Empty;

        public string? JobRole { get; set; }

        public string? Notes { get; set; }

        public string AttendanceStatus { get; set; } = "Registered";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
