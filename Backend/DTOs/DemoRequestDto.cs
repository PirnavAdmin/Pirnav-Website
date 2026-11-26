namespace Pirnav.API.DTOs
{
    public class DemoRequestDto
    {
        public string ProductId { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Phone { get; set; } = string.Empty;

        public string Company { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public DateTime? PreferredDemoDate { get; set; }

        public bool ConsentAccepted { get; set; }

        // Hidden honeypot field; legitimate visitors leave this empty
        public string? Website { get; set; }
    }
}
