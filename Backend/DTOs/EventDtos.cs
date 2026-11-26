namespace Pirnav.API.DTOs
{
    public class EventAgendaItemDto
    {
        public string Time { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Speaker { get; set; }
        public string? Description { get; set; }
    }

    public class EventSpeakerDto
    {
        public int? Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string RoleTitle { get; set; } = string.Empty;
        public string? Organization { get; set; }
        public string? Bio { get; set; }
        public string? PhotoUrl { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class CreateOrUpdateEventDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Slug { get; set; }
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
        public bool IsFeatured { get; set; }
        public bool IsRegistrationOpen { get; set; } = true;
        public int? MaxAttendees { get; set; }
        public string? WhoShouldAttend { get; set; }
        public List<EventAgendaItemDto>? AgendaItems { get; set; }
        public List<EventSpeakerDto>? Speakers { get; set; }
        public string? HighlightsSummary { get; set; }
        public string? RecordingUrl { get; set; }
    }

    public class EventRegistrationDto
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public string? JobRole { get; set; }
        public string? Notes { get; set; }
        public bool ConsentAccepted { get; set; }
        public string? Website { get; set; }
    }

    public class UpdateEventPublishDto
    {
        public string Status { get; set; } = "Published";
        public bool? IsRegistrationOpen { get; set; }
    }

    public class UpdateAttendanceDto
    {
        public string AttendanceStatus { get; set; } = "Attended";
    }

    public class AddEventVideoDto
    {
        public string MediaUrl { get; set; } = string.Empty;
        public string? Caption { get; set; }
    }
}
