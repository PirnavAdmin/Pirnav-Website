using System.Net;
using Microsoft.EntityFrameworkCore;
using Pirnav.API.DTOs;
using Pirnav.API.Helpers;
using Pirnav.API.Models;

namespace Pirnav.API.Services
{
    public class DemoService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public DemoService(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        public async Task<DemoRequest> CreateDemoRequestAsync(DemoRequestDto dto, DemoProductInfo product)
        {
            var now = DateTime.UtcNow;
            var cleanName = InputSanitizer.Clean(dto.Name.Trim());
            var cleanEmail = dto.Email.Trim().ToLowerInvariant();
            var cleanPhone = InputSanitizer.Clean(dto.Phone.Trim());
            var cleanCompany = InputSanitizer.Clean(dto.Company.Trim());
            var cleanMessage = InputSanitizer.Clean(dto.Message.Trim());

            await using var tx = await _context.Database.BeginTransactionAsync();

            var entity = new DemoRequest
            {
                ReferenceNumber = $"TMP-{Guid.NewGuid():N}",
                ProductId = product.Id,
                ProductName = product.Title,
                Name = cleanName,
                Email = cleanEmail,
                Phone = cleanPhone,
                Company = cleanCompany,
                Message = cleanMessage,
                PreferredDemoDate = dto.PreferredDemoDate,
                Status = "New",
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.DemoRequests.Add(entity);
            await _context.SaveChangesAsync();

            entity.ReferenceNumber = $"PIR-DEMO-{now:yyyy}-{entity.Id:D6}";

            _context.DemoActivities.Add(new DemoActivity
            {
                DemoRequestId = entity.Id,
                ActivityType = "Created",
                PreviousStatus = null,
                NewStatus = "New",
                Notes = $"Demo request submitted for {product.ShortName} by {cleanName} ({cleanCompany}).",
                CreatedAt = now
            });

            var (customerEmail, internalEmail) = BuildCreationEmails(entity, product);
            _context.EmailOutboxes.AddRange(customerEmail, internalEmail);

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return entity;
        }

        public EmailOutbox BuildAssignmentNotification(DemoRequest demo, DemoProductInfo product, AdminUser assignee, string assignedByName)
        {
            var baseUrl = (_config["DemoEmailSettings:PublicBaseUrl"] ?? "https://www.pirnav.com").TrimEnd('/');
            var adminLink = $"{baseUrl}/admin/demo-leads?id={demo.Id}";
            var senderEmail = _config["DemoEmailSettings:CustomerSenderEmail"] ?? "demos@pirnav.com";
            var senderName = _config["DemoEmailSettings:CustomerSenderName"] ?? "PIRNAV Product Demos";

            var safeName = WebUtility.HtmlEncode(demo.Name);
            var safeCompany = WebUtility.HtmlEncode(demo.Company);
            var safeProduct = WebUtility.HtmlEncode(product.Title);
            var safeRef = WebUtility.HtmlEncode(demo.ReferenceNumber);
            var safeAssignee = WebUtility.HtmlEncode(assignee.Username);
            var safeAssignedBy = WebUtility.HtmlEncode(assignedByName);

            var html = $@"
<div style='background:#f6f8fb;padding:28px;font-family:Segoe UI,Arial,sans-serif'>
  <div style='max-width:620px;margin:auto;background:#ffffff;border-radius:12px;border:1px solid #dce6ef;overflow:hidden'>
    <div style='background:linear-gradient(135deg,#061426,#0b7286);color:#ffffff;padding:20px 24px'>
      <h2 style='margin:0;font-size:18px'>Demo Lead Assigned</h2>
      <p style='margin:6px 0 0;font-size:13px;opacity:0.9'>Reference: {safeRef}</p>
    </div>
    <div style='padding:24px;color:#0f1f35;line-height:1.6;font-size:14px'>
      <p>Hello <b>{safeAssignee}</b>,</p>
      <p>A product demo request has been assigned to you by <b>{safeAssignedBy}</b>.</p>
      <table style='width:100%;border-collapse:collapse;margin:16px 0'>
        <tr><td style='padding:8px;background:#f6f8fb;font-weight:600'>Reference</td><td style='padding:8px;background:#ffffff'>{safeRef}</td></tr>
        <tr><td style='padding:8px;background:#f6f8fb;font-weight:600'>Product</td><td style='padding:8px;background:#ffffff'>{safeProduct}</td></tr>
        <tr><td style='padding:8px;background:#f6f8fb;font-weight:600'>Customer</td><td style='padding:8px;background:#ffffff'>{safeName} ({safeCompany})</td></tr>
        <tr><td style='padding:8px;background:#f6f8fb;font-weight:600'>Status</td><td style='padding:8px;background:#ffffff'>{WebUtility.HtmlEncode(demo.Status)}</td></tr>
      </table>
      <p><a href='{adminLink}' style='display:inline-block;background:#0b7286;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600'>Open in Admin Portal</a></p>
    </div>
  </div>
</div>";

            var text = $"Hello {assignee.Username},\n\n" +
                       $"A product demo request has been assigned to you by {assignedByName}.\n" +
                       $"Reference: {demo.ReferenceNumber}\n" +
                       $"Product: {product.Title}\n" +
                       $"Customer: {demo.Name} ({demo.Company})\n" +
                       $"Status: {demo.Status}\n" +
                       $"Admin Portal: {adminLink}\n";

            return new EmailOutbox
            {
                EmailType = "EmployeeAssignment",
                RecipientEmail = assignee.Email ?? string.Empty,
                SenderEmail = senderEmail,
                SenderName = senderName,
                Subject = $"Demo Lead Assigned – {product.ShortName} – {demo.ReferenceNumber}",
                HtmlBody = html,
                TextBody = text,
                RelatedDemoRequestId = demo.Id,
                DeliveryStatus = "Pending",
                CreatedAt = DateTime.UtcNow
            };
        }

        private (EmailOutbox Customer, EmailOutbox Internal) BuildCreationEmails(DemoRequest demo, DemoProductInfo product)
        {
            var customerSenderEmail = _config["DemoEmailSettings:CustomerSenderEmail"] ?? "demos@pirnav.com";
            var customerSenderName = _config["DemoEmailSettings:CustomerSenderName"] ?? "PIRNAV Product Demos";
            var internalRecipient = _config["DemoEmailSettings:InternalNotificationEmail"]
                ?? _config["EmailSettings:ContactEmail"]
                ?? "contact@pirnav.com";
            var supportEmail = _config["DemoEmailSettings:CustomerReplyToEmail"]
                ?? _config["EmailSettings:ContactEmail"]
                ?? "contact@pirnav.com";
            var safeSupportEmail = WebUtility.HtmlEncode(supportEmail);
            var baseUrl = (_config["DemoEmailSettings:PublicBaseUrl"] ?? "https://www.pirnav.com").TrimEnd('/');
            var adminLink = $"{baseUrl}/admin/demo-leads?id={demo.Id}";
            var logoUrl = _config["Branding:LogoUrl"] ?? $"{baseUrl}/images/pirnav-logo.png";

            var safeName = WebUtility.HtmlEncode(demo.Name);
            var safeEmail = WebUtility.HtmlEncode(demo.Email);
            var safePhone = WebUtility.HtmlEncode(demo.Phone);
            var safeCompany = WebUtility.HtmlEncode(demo.Company);
            var safeProduct = WebUtility.HtmlEncode(product.Title);
            var safeRef = WebUtility.HtmlEncode(demo.ReferenceNumber);
            var safeMsg = WebUtility.HtmlEncode(demo.Message).Replace("\n", "<br/>");
            var preferredDateDisplay = demo.PreferredDemoDate.HasValue
                ? demo.PreferredDemoDate.Value.ToString("dd MMM yyyy")
                : "Flexible / To be scheduled";

            var customerHtml = $@"
<div style='background:#f6f8fb;padding:28px;font-family:Segoe UI,Arial,sans-serif'>
  <div style='max-width:640px;margin:auto;background:#ffffff;border-radius:14px;border:1px solid #dce6ef;overflow:hidden'>
    <div style='padding:22px;text-align:center;border-bottom:1px solid #edf1f5;background:#ffffff'>
      <img src='{logoUrl}' width='132' alt='PIRNAV' style='display:block;margin:auto;' />
    </div>
    <div style='background:linear-gradient(135deg,#061426,#0b7286);color:#ffffff;padding:18px 24px;text-align:center'>
      <h2 style='margin:0;font-size:20px'>Your Demo Request Has Been Received</h2>
    </div>
    <div style='padding:26px;color:#0f1f35;font-size:14px;line-height:1.65'>
      <p>Dear <b>{safeName}</b>,</p>
      <p>Thank you for requesting a live product demonstration of <b>{safeProduct}</b> with <b>Pirnav Software Solutions Pvt Ltd</b>.</p>
      <div style='background:#eef8fa;border-left:4px solid #0b7286;border-radius:8px;padding:14px 16px;margin:18px 0'>
        <p style='margin:0 0 6px'><b>Demo Reference Number:</b> {safeRef}</p>
        <p style='margin:0 0 6px'><b>Product:</b> {safeProduct}</p>
        <p style='margin:0'><b>Preferred Date:</b> {WebUtility.HtmlEncode(preferredDateDisplay)}</p>
      </div>
      <p><b>What happens next?</b><br/>Our product specialists are reviewing your requirements and will contact you shortly to confirm a convenient demo session.</p>
      <p style='margin-top:18px'>Need immediate assistance? Reach us at <a href='mailto:{safeSupportEmail}' style='color:#0b7286'>{safeSupportEmail}</a> or call <b>040-35339312</b>.</p>
      <p style='margin-top:22px'>Warm regards,<br/><b>PIRNAV Product Demos Team</b></p>
    </div>
    <div style='text-align:center;padding:16px;background:#f6f8fb;font-size:12px;color:#526879'>
      Pirnav Software Solutions Pvt Ltd · Madhapur, Hyderabad · www.pirnav.com
    </div>
  </div>
</div>";

            var customerText = $"Dear {demo.Name},\n\n" +
                               $"Thank you for requesting a live demo of {product.Title} with Pirnav Software Solutions Pvt Ltd.\n\n" +
                               $"Demo Reference Number: {demo.ReferenceNumber}\n" +
                               $"Product: {product.Title}\n" +
                               $"Preferred Date: {preferredDateDisplay}\n\n" +
                               $"Next Steps: Our product specialists are reviewing your requirements and will contact you shortly to schedule your walkthrough.\n\n" +
                               $"Contact: {supportEmail} | 040-35339312\n\n" +
                               $"Warm regards,\nPIRNAV Product Demos Team";

            var internalHtml = $@"
<div style='background:#f6f8fb;padding:28px;font-family:Segoe UI,Arial,sans-serif'>
  <div style='max-width:640px;margin:auto;background:#ffffff;border-radius:14px;border:1px solid #dce6ef;overflow:hidden'>
    <div style='background:linear-gradient(135deg,#061426,#0b7286);color:#ffffff;padding:18px 24px'>
      <h2 style='margin:0;font-size:19px'>New Product Demo Request</h2>
      <p style='margin:6px 0 0;font-size:13px;opacity:0.9'>{WebUtility.HtmlEncode(product.ShortName)} · {safeRef}</p>
    </div>
    <div style='padding:24px;color:#0f1f35;font-size:14px;line-height:1.6'>
      <table style='width:100%;border-collapse:collapse'>
        <tr><td style='padding:9px;background:#f6f8fb;font-weight:700;width:34%'>Reference</td><td style='padding:9px'>{safeRef}</td></tr>
        <tr><td style='padding:9px;background:#f6f8fb;font-weight:700'>Product</td><td style='padding:9px'>{safeProduct}</td></tr>
        <tr><td style='padding:9px;background:#f6f8fb;font-weight:700'>Customer</td><td style='padding:9px'>{safeName}</td></tr>
        <tr><td style='padding:9px;background:#f6f8fb;font-weight:700'>Email</td><td style='padding:9px'>{safeEmail}</td></tr>
        <tr><td style='padding:9px;background:#f6f8fb;font-weight:700'>Phone</td><td style='padding:9px'>{safePhone}</td></tr>
        <tr><td style='padding:9px;background:#f6f8fb;font-weight:700'>Company</td><td style='padding:9px'>{safeCompany}</td></tr>
        <tr><td style='padding:9px;background:#f6f8fb;font-weight:700'>Preferred Date</td><td style='padding:9px'>{WebUtility.HtmlEncode(preferredDateDisplay)}</td></tr>
        <tr><td style='padding:9px;background:#f6f8fb;font-weight:700;vertical-align:top'>Requirements</td><td style='padding:9px'>{safeMsg}</td></tr>
      </table>
      <div style='margin-top:20px'>
        <a href='{adminLink}' style='display:inline-block;background:#0b7286;color:#ffffff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:600'>View Demo Lead in Admin Portal</a>
      </div>
    </div>
  </div>
</div>";

            var internalText = $"New Product Demo Request\n\n" +
                               $"Reference: {demo.ReferenceNumber}\n" +
                               $"Product: {product.Title}\n" +
                               $"Customer: {demo.Name}\n" +
                               $"Email: {demo.Email}\n" +
                               $"Phone: {demo.Phone}\n" +
                               $"Company: {demo.Company}\n" +
                               $"Preferred Date: {preferredDateDisplay}\n" +
                               $"Requirements: {demo.Message}\n\n" +
                               $"Admin Portal: {adminLink}";

            var customerOutbox = new EmailOutbox
            {
                EmailType = "CustomerAcknowledgement",
                RecipientEmail = demo.Email,
                SenderEmail = customerSenderEmail,
                SenderName = customerSenderName,
                Subject = $"Your {product.ShortName} demo request has been received | PIRNAV",
                HtmlBody = customerHtml,
                TextBody = customerText,
                RelatedDemoRequestId = demo.Id,
                DeliveryStatus = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            var internalOutbox = new EmailOutbox
            {
                EmailType = "InternalNotification",
                RecipientEmail = internalRecipient,
                SenderEmail = customerSenderEmail,
                SenderName = customerSenderName,
                Subject = $"New Product Demo Request – {product.ShortName} – {demo.ReferenceNumber}",
                HtmlBody = internalHtml,
                TextBody = internalText,
                RelatedDemoRequestId = demo.Id,
                DeliveryStatus = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            return (customerOutbox, internalOutbox);
        }
    }
}
