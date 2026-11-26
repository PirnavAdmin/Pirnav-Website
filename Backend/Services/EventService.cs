using System.Net;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Pirnav.API.DTOs;
using Pirnav.API.Helpers;
using Pirnav.API.Models;

namespace Pirnav.API.Services
{
    public class EventService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public static readonly IReadOnlyList<string> ValidCategories = new[]
        {
            "Webinars",
            "Workshops",
            "Conferences",
            "Product Launches",
            "Company Events",
            "Campus Events"
        };

        public static readonly IReadOnlyList<string> ValidModes = new[] { "Online", "Offline", "Hybrid" };
        public static readonly IReadOnlyList<string> ValidStatuses = new[] { "Draft", "Published", "Cancelled" };
        public static readonly IReadOnlyList<string> ValidAttendanceStatuses = new[] { "Registered", "Attended", "NoShow", "Cancelled" };

        public EventService(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        public async Task<string> GenerateUniqueSlugAsync(string titleOrSlug, int? excludeEventId = null)
        {
            var baseSlug = Regex.Replace((titleOrSlug ?? "event").Trim().ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');
            if (string.IsNullOrWhiteSpace(baseSlug))
                baseSlug = "pirnav-event";
            if (baseSlug.Length > 180)
                baseSlug = baseSlug.Substring(0, 180).Trim('-');

            var candidate = baseSlug;
            var suffix = 2;
            while (await _context.Events.AnyAsync(e => e.Slug == candidate && (!excludeEventId.HasValue || e.Id != excludeEventId.Value)))
            {
                candidate = $"{baseSlug}-{suffix}";
                suffix++;
            }
            return candidate;
        }

        public async Task<EventRegistration> RegisterVisitorAsync(Event ev, EventRegistrationDto dto)
        {
            var now = DateTime.UtcNow;
            var cleanName = InputSanitizer.Clean(dto.Name.Trim());
            var cleanEmail = dto.Email.Trim().ToLowerInvariant();
            var cleanPhone = InputSanitizer.Clean(dto.Phone.Trim());
            var cleanCompany = InputSanitizer.Clean(dto.Company.Trim());
            var cleanRole = string.IsNullOrWhiteSpace(dto.JobRole) ? null : InputSanitizer.Clean(dto.JobRole.Trim());
            var cleanNotes = string.IsNullOrWhiteSpace(dto.Notes) ? null : InputSanitizer.Clean(dto.Notes.Trim());

            await using var tx = await _context.Database.BeginTransactionAsync();

            var registration = new EventRegistration
            {
                EventId = ev.Id,
                ReferenceNumber = $"TMP-{Guid.NewGuid():N}",
                Name = cleanName,
                Email = cleanEmail,
                Phone = cleanPhone,
                Company = cleanCompany,
                JobRole = cleanRole,
                Notes = cleanNotes,
                AttendanceStatus = "Registered",
                CreatedAt = now
            };

            _context.EventRegistrations.Add(registration);
            await _context.SaveChangesAsync();

            registration.ReferenceNumber = $"PIR-EVT-{now:yyyy}-{registration.Id:D6}";

            var (attendeeEmail, internalEmail) = BuildRegistrationEmails(ev, registration);
            _context.EmailOutboxes.AddRange(attendeeEmail, internalEmail);

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return registration;
        }

        private (EmailOutbox Attendee, EmailOutbox Internal) BuildRegistrationEmails(Event ev, EventRegistration reg)
        {
            var senderEmail = _config["DemoEmailSettings:CustomerSenderEmail"]
                ?? _config["EmailSettings:SenderEmail"]
                ?? "devivaraprasad63@gmail.com";
            var senderName = _config["DemoEmailSettings:CustomerSenderName"] ?? "PIRNAV Events";
            var internalRecipient = _config["DemoEmailSettings:InternalNotificationEmail"]
                ?? _config["EmailSettings:ContactEmail"]
                ?? "devivaraprasad63@gmail.com";
            var supportEmail = _config["DemoEmailSettings:CustomerReplyToEmail"]
                ?? _config["EmailSettings:ContactEmail"]
                ?? "devivaraprasad63@gmail.com";
            var baseUrl = (_config["DemoEmailSettings:PublicBaseUrl"] ?? "http://localhost:5173").TrimEnd('/');
            var eventUrl = $"{baseUrl}/events/{ev.Slug}";
            var adminUrl = $"{baseUrl}/admin/event-registrations?eventId={ev.Id}";

            var dateRange = $"{ev.StartDateTime:dd MMM yyyy, hh:mm tt} – {ev.EndDateTime:hh:mm tt} ({ev.Timezone})";
            var safeTitle = WebUtility.HtmlEncode(ev.Title);
            var safeName = WebUtility.HtmlEncode(reg.Name);
            var safeRef = WebUtility.HtmlEncode(reg.ReferenceNumber);
            var safeLocation = WebUtility.HtmlEncode(ev.LocationOrPlatform);
            var safeMode = WebUtility.HtmlEncode(ev.EventMode);
            var safeSupport = WebUtility.HtmlEncode(supportEmail);

            var meetingBlockHtml = !string.IsNullOrWhiteSpace(ev.MeetingLink)
                ? $"<p style='margin:6px 0 0'><b>Join Link:</b> <a href='{WebUtility.HtmlEncode(ev.MeetingLink)}' style='color:#0b7286'>{WebUtility.HtmlEncode(ev.MeetingLink)}</a></p>"
                : string.Empty;

            var attendeeHtml = $@"
<div style='background:#f6f8fb;padding:28px;font-family:Segoe UI,Arial,sans-serif'>
  <div style='max-width:640px;margin:auto;background:#ffffff;border-radius:14px;border:1px solid #dce6ef;overflow:hidden'>
    <div style='background:linear-gradient(135deg,#061426,#0b7286);color:#ffffff;padding:20px 24px'>
      <h2 style='margin:0;font-size:20px'>Event Registration Confirmed</h2>
      <p style='margin:6px 0 0;font-size:13px;opacity:0.9'>{safeTitle}</p>
    </div>
    <div style='padding:26px;color:#0f1f35;font-size:14px;line-height:1.65'>
      <p>Dear <b>{safeName}</b>,</p>
      <p>Thank you for registering for <b>{safeTitle}</b> with <b>Pirnav Software Solutions Pvt Ltd</b>.</p>
      <div style='background:#eef8fa;border-left:4px solid #0b7286;border-radius:8px;padding:14px 16px;margin:18px 0'>
        <p style='margin:0 0 6px'><b>Registration Reference:</b> {safeRef}</p>
        <p style='margin:0 0 6px'><b>Date &amp; Time:</b> {WebUtility.HtmlEncode(dateRange)}</p>
        <p style='margin:0 0 6px'><b>Format:</b> {safeMode} · {safeLocation}</p>
        {meetingBlockHtml}
      </div>
      <p><a href='{eventUrl}' style='display:inline-block;background:#0b7286;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600'>View Event Details</a></p>
      <p style='margin-top:18px'>Questions? Contact us at <a href='mailto:{safeSupport}' style='color:#0b7286'>{safeSupport}</a> or call <b>040-35339312</b>.</p>
      <p style='margin-top:20px'>Warm regards,<br/><b>PIRNAV Events Team</b></p>
    </div>
  </div>
</div>";

            var attendeeText = $"Dear {reg.Name},\n\n" +
                               $"Your registration for {ev.Title} is confirmed!\n\n" +
                               $"Reference Number: {reg.ReferenceNumber}\n" +
                               $"Date & Time: {dateRange}\n" +
                               $"Format: {ev.EventMode} - {ev.LocationOrPlatform}\n" +
                               (!string.IsNullOrWhiteSpace(ev.MeetingLink) ? $"Join Link: {ev.MeetingLink}\n" : "") +
                               $"Event Page: {eventUrl}\n\n" +
                               $"Contact: {supportEmail} | 040-35339312\n\nPIRNAV Events Team";

            var internalHtml = $@"
<div style='background:#f6f8fb;padding:28px;font-family:Segoe UI,Arial,sans-serif'>
  <div style='max-width:640px;margin:auto;background:#ffffff;border-radius:14px;border:1px solid #dce6ef;overflow:hidden'>
    <div style='background:linear-gradient(135deg,#061426,#0b7286);color:#ffffff;padding:18px 24px'>
      <h2 style='margin:0;font-size:19px'>New Event Registration</h2>
      <p style='margin:6px 0 0;font-size:13px;opacity:0.9'>{safeTitle} · {safeRef}</p>
    </div>
    <div style='padding:24px;color:#0f1f35;font-size:14px;line-height:1.6'>
      <table style='width:100%;border-collapse:collapse'>
        <tr><td style='padding:8px;background:#f6f8fb;font-weight:700;width:34%'>Reference</td><td style='padding:8px'>{safeRef}</td></tr>
        <tr><td style='padding:8px;background:#f6f8fb;font-weight:700'>Event</td><td style='padding:8px'>{safeTitle}</td></tr>
        <tr><td style='padding:8px;background:#f6f8fb;font-weight:700'>Attendee</td><td style='padding:8px'>{safeName}</td></tr>
        <tr><td style='padding:8px;background:#f6f8fb;font-weight:700'>Email</td><td style='padding:8px'>{WebUtility.HtmlEncode(reg.Email)}</td></tr>
        <tr><td style='padding:8px;background:#f6f8fb;font-weight:700'>Phone</td><td style='padding:8px'>{WebUtility.HtmlEncode(reg.Phone)}</td></tr>
        <tr><td style='padding:8px;background:#f6f8fb;font-weight:700'>Company</td><td style='padding:8px'>{WebUtility.HtmlEncode(reg.Company)}</td></tr>
        <tr><td style='padding:8px;background:#f6f8fb;font-weight:700'>Role</td><td style='padding:8px'>{WebUtility.HtmlEncode(reg.JobRole ?? "—")}</td></tr>
      </table>
      <div style='margin-top:20px'>
        <a href='{adminUrl}' style='display:inline-block;background:#0b7286;color:#ffffff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:600'>View Registrations in Admin Portal</a>
      </div>
    </div>
  </div>
</div>";

            var internalText = $"New Event Registration\n\n" +
                               $"Reference: {reg.ReferenceNumber}\n" +
                               $"Event: {ev.Title}\n" +
                               $"Attendee: {reg.Name}\n" +
                               $"Email: {reg.Email}\n" +
                               $"Phone: {reg.Phone}\n" +
                               $"Company: {reg.Company}\n" +
                               $"Role: {reg.JobRole ?? "—"}\n\n" +
                               $"Admin Portal: {adminUrl}";

            var attendeeOutbox = new EmailOutbox
            {
                EmailType = "EventRegistrationConfirmation",
                RecipientEmail = reg.Email,
                SenderEmail = senderEmail,
                SenderName = senderName,
                Subject = $"Registration Confirmed: {ev.Title} ({reg.ReferenceNumber}) | PIRNAV",
                HtmlBody = attendeeHtml,
                TextBody = attendeeText,
                RelatedEventRegistrationId = reg.Id,
                DeliveryStatus = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            var internalOutbox = new EmailOutbox
            {
                EmailType = "EventRegistrationNotification",
                RecipientEmail = internalRecipient,
                SenderEmail = senderEmail,
                SenderName = senderName,
                Subject = $"New Event Registration – {ev.Title} – {reg.ReferenceNumber}",
                HtmlBody = internalHtml,
                TextBody = internalText,
                RelatedEventRegistrationId = reg.Id,
                DeliveryStatus = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            return (attendeeOutbox, internalOutbox);
        }

        public static string EscapeCsvCell(string? value)
        {
            var raw = value ?? string.Empty;
            if (raw.Length > 0 && (raw[0] == '=' || raw[0] == '+' || raw[0] == '-' || raw[0] == '@' || raw[0] == '\t' || raw[0] == '\r'))
            {
                raw = "'" + raw;
            }
            return "\"" + raw.Replace("\"", "\"\"") + "\"";
        }
    }
}
