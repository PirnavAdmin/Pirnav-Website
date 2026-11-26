using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Pirnav.API.Models
{
    [Table("EventSpeakers")]
    public class EventSpeaker
    {
        public int Id { get; set; }

        public int EventId { get; set; }

        [JsonIgnore]
        public Event? Event { get; set; }

        public string Name { get; set; } = string.Empty;

        public string RoleTitle { get; set; } = string.Empty;

        public string? Organization { get; set; }

        public string? Bio { get; set; }

        public string? PhotoUrl { get; set; }

        public int DisplayOrder { get; set; } = 0;
    }
}
