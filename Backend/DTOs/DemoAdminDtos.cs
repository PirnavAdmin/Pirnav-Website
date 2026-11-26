namespace Pirnav.API.DTOs
{
    public class UpdateDemoStatusDto
    {
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime? FollowUpDate { get; set; }
    }

    public class AssignDemoDto
    {
        public int? AssignedToUserId { get; set; }
        public string? Notes { get; set; }
        public DateTime? FollowUpDate { get; set; }
    }

    public class AddDemoActivityDto
    {
        public string Notes { get; set; } = string.Empty;
        public string? ActivityType { get; set; }
        public DateTime? FollowUpDate { get; set; }
    }
}
