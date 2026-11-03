namespace Pirnav.API.Models;

public class SmtpSettings
{
    public string SMTP_SERVER { get; set; } = "";
    public string SMTP_PORT { get; set; } = "465";
    public string EMAIL_SENDER_NAME { get; set; } = "";
    public string EMAIL_SENDER_EMAIL { get; set; } = "";
    public string EMAIL_PASSWORD { get; set; } = "";
    public string EMAIL_CONTACT { get; set; } = "";
    public string EMAIL_HR { get; set; } = "";
}