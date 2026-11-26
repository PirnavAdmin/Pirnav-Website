using System.ComponentModel.DataAnnotations.Schema;

namespace Pirnav.API.Models
{
    [Table("Events")]
    public class Event
    {
        public int Id { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Slug { get; set; } = string.Empty;

        public string Category { get; set; } = "Webinars";

        public string ShortDescription { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string EventMode { get; set; } = "Online";

        public string LocationOrPlatform { get; set; } = string.Empty;

        public string? MeetingLink { get; set; }

        public DateTime StartDateTime { get; set; }

        public DateTime EndDateTime { get; set; }

        public string Timezone { get; set; } = "IST (UTC+05:30)";

        public string? BannerImageUrl { get; set; }

        public string Status { get; set; } = "Published";

        public bool IsFeatured { get; set; } = false;

        public bool IsRegistrationOpen { get; set; } = true;

        public int? MaxAttendees { get; set; }

        public string? WhoShouldAttend { get; set; }

        public string? AgendaJson { get; set; }

        public string? HighlightsSummary { get; set; }

        public string? RecordingUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<EventSpeaker> Speakers { get; set; } = new List<EventSpeaker>();

        public ICollection<EventRegistration> Registrations { get; set; } = new List<EventRegistration>();

        public ICollection<EventActivity> Activities { get; set; } = new List<EventActivity>();

        public ICollection<EventGallery> GalleryItems { get; set; } = new List<EventGallery>();
    }
}
