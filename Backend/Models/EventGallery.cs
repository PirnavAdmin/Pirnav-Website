using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Pirnav.API.Models
{
    [Table("EventGallery")]
    public class EventGallery
    {
        public int Id { get; set; }

        public int EventId { get; set; }

        [JsonIgnore]
        public Event? Event { get; set; }

        public string MediaType { get; set; } = "Image";

        public string MediaUrl { get; set; } = string.Empty;

        public string? Caption { get; set; }

        public int DisplayOrder { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
