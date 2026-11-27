using System.Net;
using System.Text;
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
        private readonly EmailService? _emailService;
        private readonly ILogger<DemoService>? _logger;

        public DemoService(
            AppDbContext context,
            IConfiguration config,
            EmailService? emailService = null,
            ILogger<DemoService>? logger = null)
        {
            _context = context;
            _config = config;
            _emailService = emailService;
            _logger = logger;
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
            var canDispatchImmediately = _emailService != null && _config.GetValue("DemoEmailSettings:EnableOutboxDelivery", true);
            if (canDispatchImmediately)
            {
                // Mark as Processing during commit so another host polling shared DB cannot steal local delivery
                customerEmail.DeliveryStatus = "Processing";
                internalEmail.DeliveryStatus = "Processing";
            }

            _context.EmailOutboxes.AddRange(customerEmail, internalEmail);

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            if (canDispatchImmediately)
            {
                await DispatchOutboxItemsImmediatelyAsync(new[] { customerEmail, internalEmail });
            }

            return entity;
        }

        private async Task DispatchOutboxItemsImmediatelyAsync(IReadOnlyList<EmailOutbox> items)
        {
            if (_emailService == null || items.Count == 0)
                return;

            var replyToEmail = _config["DemoEmailSettings:CustomerReplyToEmail"];
            foreach (var item in items)
            {
                if (string.IsNullOrWhiteSpace(item.RecipientEmail))
                {
                    item.DeliveryStatus = "FailedPermanent";
                    item.LastError = "Recipient email address is empty.";
                    continue;
                }

                item.AttemptCount += 1;
                try
                {
                    await _emailService.SendEmailAsync(
                        item.RecipientEmail,
                        item.Subject,
                        item.HtmlBody,
                        customSenderEmail: item.SenderEmail,
                        customSenderName: item.SenderName,
                        plainTextBody: item.TextBody,
                        replyToEmail: replyToEmail);

                    item.DeliveryStatus = "Sent";
                    item.SentAt = DateTime.UtcNow;
                    item.NextRetryAt = null;
                    item.LastError = null;
                }
                catch (Exception ex)
                {
                    var sanitizedError = $"{ex.GetType().Name}: {ex.Message}";
                    if (sanitizedError.Length > 480)
                        sanitizedError = sanitizedError.Substring(0, 480);

                    item.DeliveryStatus = "Failed";
                    item.LastError = sanitizedError;
                    item.NextRetryAt = DateTime.UtcNow.AddMinutes(1);
                    _logger?.LogWarning(
                        ex,
                        "Immediate delivery failed for Outbox {OutboxId} ({EmailType}); queued for background retry.",
                        item.Id,
                        item.EmailType);
                }
            }

            await _context.SaveChangesAsync();
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
            var customerSenderName = _config["DemoEmailSettings:CustomerSenderName"] ?? "PIRNAV Software Solutions";
            var internalRecipient = _config["DemoEmailSettings:InternalNotificationEmail"]
                ?? _config["EmailSettings:ContactEmail"]
                ?? "contact@pirnav.com";
            var supportEmail = _config["DemoEmailSettings:CustomerReplyToEmail"]
                ?? _config["EmailSettings:ContactEmail"]
                ?? "contact@pirnav.com";
            var baseUrl = (_config["DemoEmailSettings:PublicBaseUrl"] ?? "https://www.pirnav.com").TrimEnd('/');
            var isLocalBase = baseUrl.Contains("localhost", StringComparison.OrdinalIgnoreCase) ||
                              baseUrl.Contains("127.0.0.1", StringComparison.OrdinalIgnoreCase);
            var publicSiteUrl = isLocalBase ? "https://www.pirnav.com" : baseUrl;
            var adminLink = $"{baseUrl}/admin";

            var safeName = WebUtility.HtmlEncode(demo.Name);
            var safeEmail = WebUtility.HtmlEncode(demo.Email);
            var safePhone = WebUtility.HtmlEncode(demo.Phone);
            var safeCompany = WebUtility.HtmlEncode(demo.Company);
            var safeProduct = WebUtility.HtmlEncode(product.Title);
            var safeShortProduct = WebUtility.HtmlEncode(product.ShortName);
            var safeRef = WebUtility.HtmlEncode(demo.ReferenceNumber);
            var safeMsg = WebUtility.HtmlEncode(demo.Message).Replace("\n", "<br/>");
            var safeSupportEmail = WebUtility.HtmlEncode(supportEmail);
            var preferredDateDisplay = demo.PreferredDemoDate.HasValue
                ? demo.PreferredDemoDate.Value.ToString("dd MMM yyyy")
                : "Flexible / To be scheduled";
            var safePreferredDate = WebUtility.HtmlEncode(preferredDateDisplay);

            var customerHtml = BuildCustomerConfirmationHtml(
                publicSiteUrl,
                safeName,
                safeEmail,
                safePhone,
                safeCompany,
                safeProduct,
                safeShortProduct,
                safeRef,
                safePreferredDate,
                safeMsg,
                safeSupportEmail);

            var customerText = $"Hi {demo.Name},\n\n" +
                               $"Thank you for your interest in {product.ShortName}. We've received your product demo request and our team will get in touch with you shortly to schedule the demo.\n\n" +
                               $"Reference No.: {demo.ReferenceNumber}\n" +
                               $"Product: {product.Title}\n" +
                               $"Customer: {demo.Name}\n" +
                               $"Company: {demo.Company}\n" +
                               $"Preferred Date: {preferredDateDisplay}\n" +
                               $"Email: {demo.Email}\n" +
                               $"Phone: {demo.Phone}\n" +
                               $"Requirements: {demo.Message}\n\n" +
                               $"You'll receive further updates on this request via email.\n" +
                               $"Need Help? Email {supportEmail} or call 040-35339312\n\n" +
                               $"Warm regards,\nPIRNAV Software Solutions Pvt. Ltd.";

            var internalHtml = BuildInternalNotificationHtml(
                publicSiteUrl,
                adminLink,
                safeName,
                safeEmail,
                safePhone,
                safeCompany,
                safeProduct,
                safeShortProduct,
                safeRef,
                safePreferredDate,
                safeMsg,
                safeSupportEmail);

            var internalText = $"New Product Demo Request\n\n" +
                               $"Reference: {demo.ReferenceNumber}\n" +
                               $"Product: {product.Title}\n" +
                               $"Customer: {demo.Name}\n" +
                               $"Email: {demo.Email}\n" +
                               $"Phone: {demo.Phone}\n" +
                               $"Company: {demo.Company}\n" +
                               $"Preferred Date: {preferredDateDisplay}\n" +
                               $"Requirements: {demo.Message}\n\n" +
                               $"View Demo Request: {adminLink}";

            var customerOutbox = new EmailOutbox
            {
                EmailType = "CustomerAcknowledgement",
                RecipientEmail = demo.Email,
                SenderEmail = customerSenderEmail,
                SenderName = customerSenderName,
                Subject = $"PIRNAV \u2013 {product.ShortName} Demo Request Confirmation ({demo.ReferenceNumber})",
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
                Subject = $"New Product Demo Request \u2013 {product.ShortName} \u2013 {demo.ReferenceNumber}",
                HtmlBody = internalHtml,
                TextBody = internalText,
                RelatedDemoRequestId = demo.Id,
                DeliveryStatus = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            return (customerOutbox, internalOutbox);
        }

        private static string BuildCustomerConfirmationHtml(
            string baseUrl,
            string safeName,
            string safeEmail,
            string safePhone,
            string safeCompany,
            string safeProduct,
            string safeShortProduct,
            string safeRef,
            string safePreferredDate,
            string safeMsg,
            string safeSupportEmail)
        {
            var leftFields = new (string Cid, string Label, string ValueHtml)[]
            {
                ("pirnav-icon-product", "Product", safeProduct),
                ("pirnav-icon-user", "Customer", safeName),
                ("pirnav-icon-company", "Company", safeCompany),
                ("pirnav-icon-calendar", "Preferred Date", safePreferredDate),
            };

            var rightFields = new (string Cid, string Label, string ValueHtml)[]
            {
                ("pirnav-icon-email", "Email", $"<a href='mailto:{safeEmail}' style='color:#0b7286;text-decoration:underline;word-break:break-all;'>{safeEmail}</a>"),
                ("pirnav-icon-phone", "Phone", safePhone),
                ("pirnav-icon-notes", "Requirements", safeMsg),
            };

            var fieldsGridHtml = BuildTwoColumnDetailGrid(leftFields, rightFields);

            var innerRows = $@"
          <!-- Dark Navy Top Bar -->
          <tr>
            <td style='background-color:#061829;padding:16px 24px 10px 24px;' class='mob-pad'>
              <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'>
                <tr>
                  <td align='left' valign='middle' class='mob-stack-td'>
                    <img src='cid:pirnav-logo-white' width='136' alt='PIRNAV Software Solutions' class='mob-logo' style='display:block;width:136px;max-width:100%;height:auto;border:0;' />
                  </td>
                  <td align='right' valign='middle' class='mob-stack-td mob-header-links' style='font-size:12px;color:#cbd5e1;white-space:nowrap;'>
                    <a href='{baseUrl}/about' style='color:#e2e8f0;text-decoration:none;'>People</a>
                    <span style='color:#47697e;padding:0 7px;'>|</span>
                    <a href='{baseUrl}/products' style='color:#e2e8f0;text-decoration:none;'>Products</a>
                    <span style='color:#47697e;padding:0 7px;'>|</span>
                    <a href='{baseUrl}/services' style='color:#e2e8f0;text-decoration:none;'>Technology</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Teal Wave Banner with Checkmark Badge -->
          <tr>
            <td style='background-color:#ffffff;padding:0;line-height:0;font-size:0;'>
              <img src='cid:pirnav-customer-wave' width='640' alt='Demo Request Confirmed' style='display:block;width:100%;max-width:640px;height:auto;border:0;' />
            </td>
          </tr>

          <!-- Main Heading & Greeting -->
          <tr>
            <td class='mob-pad' style='padding:6px 28px 20px 28px;background-color:#ffffff;'>
              <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'>
                <tr>
                  <td align='center' style='padding:0 0 6px 0;'>
                    <h1 class='mob-hero-title' style='margin:0;font-size:26px;line-height:1.25;font-weight:800;color:#0b1c2c;letter-spacing:-0.02em;'>Demo Request Confirmed!</h1>
                  </td>
                </tr>
                <tr>
                  <td align='center' style='padding:0 0 18px 0;'>
                    <img src='cid:pirnav-orange-curve' width='146' alt='' style='display:block;width:146px;height:auto;border:0;margin:0 auto;' />
                  </td>
                </tr>
                <tr>
                  <td style='font-size:16px;font-weight:700;color:#0f172a;padding:0 0 6px 0;'>
                    Hi {safeName},
                  </td>
                </tr>
                <tr>
                  <td style='font-size:14px;line-height:1.65;color:#334155;padding:0 0 18px 0;'>
                    Thank you for your interest in <strong style='color:#0f172a;'>{safeShortProduct}</strong>. We&#39;ve received your product demo request and our team will get in touch with you shortly to schedule the demo.
                  </td>
                </tr>

                <!-- Details Card -->
                <tr>
                  <td class='mob-card-pad' style='background-color:#f9fbfd;border:1px solid #d5e2ea;border-radius:12px;padding:18px 18px 14px 18px;'>
                    <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'>
                      <tr>
                        <td style='padding:0 0 12px 0;border-bottom:1px solid #e4edf3;'>
                          <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'>
                            <tr>
                              <td align='left' valign='middle' class='mob-stack-td'>
                                <table role='presentation' cellpadding='0' cellspacing='0' border='0'>
                                  <tr>
                                    <td valign='middle' style='padding-right:9px;'>
                                      <img src='cid:pirnav-icon-monitor' width='24' height='24' alt='' style='display:block;width:24px;height:24px;border:0;' />
                                    </td>
                                    <td valign='middle' style='font-size:15px;font-weight:700;color:#0f172a;'>
                                      Your Demo Request Details
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td align='right' valign='middle' class='mob-stack-td mob-left mob-ref-row'>
                                <table role='presentation' cellpadding='0' cellspacing='0' border='0' style='display:inline-table;'>
                                  <tr>
                                    <td style='background-color:#f97316;color:#ffffff;font-size:11px;font-weight:700;padding:5px 10px;border-radius:999px;white-space:nowrap;'>
                                      Reference No.
                                    </td>
                                    <td width='6' style='width:6px;'></td>
                                    <td style='background-color:#fde8d7;color:#0f172a;font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px;white-space:nowrap;font-family:Consolas,Menlo,monospace;'>
                                      {safeRef}
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style='padding:14px 0 0 0;'>
                          {fieldsGridHtml}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Updates Note -->
                <tr>
                  <td align='center' style='font-size:13px;line-height:1.5;color:#475569;padding:16px 8px 14px 8px;'>
                    You&#39;ll receive further updates on this request via email.
                  </td>
                </tr>

                <!-- Need Help Bar -->
                <tr>
                  <td style='background-color:#edf6f8;border:1px solid #d5e8ed;border-radius:10px;padding:14px 16px;'>
                    <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'>
                      <tr>
                        <td valign='middle' class='mob-stack-td' style='padding-right:10px;'>
                          <table role='presentation' cellpadding='0' cellspacing='0' border='0'>
                            <tr>
                              <td valign='middle' style='padding-right:10px;'>
                                <img src='cid:pirnav-icon-headset' width='28' height='28' alt='' style='display:block;width:28px;height:28px;border:0;' />
                              </td>
                              <td valign='middle'>
                                <div style='font-size:14px;font-weight:700;color:#0f172a;line-height:1.25;'>Need Help?</div>
                                <div style='font-size:12px;color:#475569;line-height:1.35;'>Our team is happy to assist you.</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td align='right' valign='middle' class='mob-stack-td mob-left mob-ref-row'>
                          <table role='presentation' cellpadding='0' cellspacing='0' border='0' style='display:inline-table;'>
                            <tr>
                              <td valign='middle' style='padding-right:6px;'>
                                <img src='cid:pirnav-icon-email' width='20' height='20' alt='' style='display:block;width:20px;height:20px;border:0;' />
                              </td>
                              <td valign='middle' style='font-size:12.5px;padding-right:12px;'>
                                <a href='mailto:{safeSupportEmail}' style='color:#0b7286;text-decoration:none;font-weight:600;word-break:break-all;'>{safeSupportEmail}</a>
                              </td>
                            </tr>
                          </table>
                          <table role='presentation' cellpadding='0' cellspacing='0' border='0' style='display:inline-table;'>
                            <tr>
                              <td valign='middle' style='padding-right:6px;'>
                                <img src='cid:pirnav-icon-phone' width='20' height='20' alt='' style='display:block;width:20px;height:20px;border:0;' />
                              </td>
                              <td valign='middle' style='font-size:12.5px;color:#0f172a;font-weight:600;white-space:nowrap;'>
                                040-35339312
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Dark Navy Footer -->
          <tr>
            <td style='background-color:#061829;background-image:linear-gradient(135deg,#061829,#0a4c5e);padding:18px 24px;'>
              <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'>
                <tr>
                  <td valign='middle' align='left' class='mob-stack-td mob-center' style='padding-right:12px;'>
                    <img src='cid:pirnav-logo-white' width='118' alt='PIRNAV' style='display:inline-block;width:118px;height:auto;border:0;' />
                  </td>
                  <td valign='middle' align='left' class='mob-stack-td mob-center mob-ref-row' style='font-size:12px;line-height:1.45;color:#cbd5e1;padding:0 12px;'>
                    Building practical, people-centric technology solutions for modern businesses.
                  </td>
                  <td valign='middle' align='right' class='mob-stack-td mob-center mob-ref-row' style='white-space:nowrap;'>
                    <a href='https://www.linkedin.com/company/pirnav/posts/?feedView=all' style='display:inline-block;text-decoration:none;margin-right:6px;'>
                      <img src='cid:pirnav-icon-linkedin' width='26' height='26' alt='LinkedIn' style='display:inline-block;width:26px;height:26px;border:0;' />
                    </a>
                    <a href='{baseUrl}' style='display:inline-block;text-decoration:none;'>
                      <img src='cid:pirnav-icon-globe' width='26' height='26' alt='Website' style='display:inline-block;width:26px;height:26px;border:0;' />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>";

            var preheader = $"Thank you for your interest in {safeShortProduct}. Reference No.: {safeRef}.";
            return WrapResponsiveEmailDocument($"Demo Request Confirmed - {safeRef}", preheader, innerRows);
        }

        private static string BuildInternalNotificationHtml(
            string baseUrl,
            string adminLink,
            string safeName,
            string safeEmail,
            string safePhone,
            string safeCompany,
            string safeProduct,
            string safeShortProduct,
            string safeRef,
            string safePreferredDate,
            string safeMsg,
            string safeSupportEmail)
        {
            var leftFields = new (string Cid, string Label, string ValueHtml)[]
            {
                ("pirnav-icon-ref", "Reference", $"<span style='font-weight:700;color:#0f172a;'>{safeRef}</span>"),
                ("pirnav-icon-product", "Product", safeProduct),
                ("pirnav-icon-user", "Customer", safeName),
                ("pirnav-icon-email", "Email", $"<a href='mailto:{safeEmail}' style='color:#0b7286;text-decoration:underline;word-break:break-all;'>{safeEmail}</a>"),
            };

            var rightFields = new (string Cid, string Label, string ValueHtml)[]
            {
                ("pirnav-icon-phone", "Phone", safePhone),
                ("pirnav-icon-company", "Company", safeCompany),
                ("pirnav-icon-calendar", "Preferred Date", safePreferredDate),
                ("pirnav-icon-notes", "Requirements", safeMsg),
            };

            var fieldsGridHtml = BuildTwoColumnDetailGrid(leftFields, rightFields);
            var safeAdminLink = WebUtility.HtmlEncode(adminLink);

            var innerRows = $@"
          <!-- Brand Top Strip -->
          <tr>
            <td style='background-color:#061829;padding:14px 24px;border-bottom:1px solid #163b52;' class='mob-pad'>
              <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'>
                <tr>
                  <td align='left' valign='middle' class='mob-stack-td'>
                    <img src='cid:pirnav-logo-white' width='136' alt='PIRNAV Software Solutions' class='mob-logo' style='display:block;width:136px;max-width:100%;height:auto;border:0;' />
                  </td>
                  <td align='right' valign='middle' class='mob-stack-td mob-header-links' style='font-size:12px;line-height:1.35;color:#cbd5e1;'>
                    Innovative Solutions for<br class='mob-hide' /> Modern Businesses
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Dark Hero Banner with Orange Accent & Laptop Visual -->
          <tr>
            <td style='background-color:#061829;background-image:linear-gradient(125deg,#061829 0%,#083448 62%,#0d6272 100%);padding:22px 24px;' class='mob-pad'>
              <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'>
                <tr>
                  <td valign='middle' class='mob-stack-td' style='padding-right:14px;'>
                    <table role='presentation' cellpadding='0' cellspacing='0' border='0'>
                      <tr>
                        <td style='width:38px;height:3px;background-color:#f97316;border-radius:2px;font-size:0;line-height:0;'>&nbsp;</td>
                      </tr>
                    </table>
                    <h1 class='mob-hero-title' style='margin:10px 0 8px 0;font-size:26px;line-height:1.18;font-weight:800;color:#ffffff;letter-spacing:-0.02em;'>
                      New Product<br />Demo Request
                    </h1>
                    <p style='margin:0;font-size:13px;line-height:1.45;color:#cbd5e1;'>
                      {safeShortProduct} <span style='color:#64879b;padding:0 4px;'>&middot;</span> <span style='color:#94e2ea;font-weight:600;'>{safeRef}</span>
                    </p>
                  </td>
                  <td align='right' valign='middle' width='240' class='mob-stack-td mob-center' style='width:240px;'>
                    <img src='cid:pirnav-admin-hero' width='230' alt='PIRNAV Product Demo Console' class='mob-hero-img' style='display:block;width:230px;max-width:100%;height:auto;border:0;margin-left:auto;' />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body & Lead Details Card -->
          <tr>
            <td class='mob-pad' style='padding:24px 28px 26px 28px;background-color:#ffffff;'>
              <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'>
                <tr>
                  <td style='font-size:17px;font-weight:700;color:#0f172a;padding:0 0 6px 0;'>
                    Hello Team,
                  </td>
                </tr>
                <tr>
                  <td style='font-size:14px;line-height:1.65;color:#334155;padding:0 0 18px 0;'>
                    A new product demo request has been received through the <strong style='color:#0f172a;'>PIRNAV</strong> website. Please find the details below and take the necessary action.
                  </td>
                </tr>

                <!-- Two-Column Responsive Details Card -->
                <tr>
                  <td class='mob-card-pad' style='background-color:#f8fbfd;border:1px solid #dce7ef;border-radius:12px;padding:18px 18px 14px 18px;'>
                    {fieldsGridHtml}
                  </td>
                </tr>

                <!-- CTA Button -> PIRNAV /admin -->
                <tr>
                  <td align='center' style='padding:22px 0 4px 0;'>
                    <a class='mob-cta' href='{safeAdminLink}' target='_blank' rel='noopener noreferrer' style='display:inline-block;background-color:#0b7286;background-image:linear-gradient(90deg,#0b7286,#0f8a9c);color:#ffffff;font-size:15px;font-weight:700;line-height:1.2;text-decoration:none;padding:13px 32px;border-radius:999px;text-align:center;'>
                      View Demo Request &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Dark Navy Footer with Locations & Contact -->
          <tr>
            <td style='background-color:#061829;border-bottom:3px solid #f97316;padding:18px 24px;'>
              <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'>
                <tr>
                  <td valign='middle' align='left' class='mob-stack-td mob-center' style='padding-right:16px;'>
                    <img src='cid:pirnav-logo-white' width='118' alt='PIRNAV' style='display:inline-block;width:118px;height:auto;border:0;' />
                  </td>
                  <td valign='middle' align='right' class='mob-stack-td mob-center mob-ref-row' style='font-size:12px;line-height:1.5;color:#cbd5e1;'>
                    <div style='padding-bottom:4px;'>
                      <img src='cid:pirnav-icon-pin' width='14' height='14' alt='' style='display:inline-block;vertical-align:middle;width:14px;height:14px;border:0;margin-right:4px;' />
                      <span style='vertical-align:middle;'>Madhapur, Hyderabad</span>
                    </div>
                    <div>
                      <img src='cid:pirnav-icon-globe' width='14' height='14' alt='' style='display:inline-block;vertical-align:middle;width:14px;height:14px;border:0;margin-right:4px;' />
                      <a href='{baseUrl}' style='color:#e2e8f0;text-decoration:none;vertical-align:middle;margin-right:10px;'>www.pirnav.com</a>
                      <img src='cid:pirnav-icon-mail-white' width='14' height='14' alt='' style='display:inline-block;vertical-align:middle;width:14px;height:14px;border:0;margin-right:4px;' />
                      <a href='mailto:{safeSupportEmail}' style='color:#94e2ea;text-decoration:none;vertical-align:middle;word-break:break-all;'>{safeSupportEmail}</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>";

            var preheader = $"New demo request for {safeShortProduct} from {safeName} ({safeCompany}) - Ref {safeRef}.";
            return WrapResponsiveEmailDocument($"New Product Demo Request - {safeRef}", preheader, innerRows);
        }

        private static string BuildTwoColumnDetailGrid(
            IReadOnlyList<(string Cid, string Label, string ValueHtml)> leftFields,
            IReadOnlyList<(string Cid, string Label, string ValueHtml)> rightFields)
        {
            var leftHtml = BuildDetailFieldRows(leftFields);
            var rightHtml = BuildDetailFieldRows(rightFields);

            return $@"
              <!--[if mso]>
              <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'>
                <tr>
                  <td width='50%' valign='top' style='padding-right:10px;'>{leftHtml}</td>
                  <td width='50%' valign='top' style='padding-left:10px;'>{rightHtml}</td>
                </tr>
              </table>
              <![endif]-->
              <!--[if !mso]><!-->
              <div style='font-size:0;line-height:0;text-align:left;'>
                <div class='email-col col-pad-left' style='display:inline-block;width:100%;max-width:264px;vertical-align:top;padding-right:8px;box-sizing:border-box;font-size:13px;line-height:1.45;'>
                  {leftHtml}
                </div><div class='email-col col-pad-right' style='display:inline-block;width:100%;max-width:264px;vertical-align:top;padding-left:8px;box-sizing:border-box;font-size:13px;line-height:1.45;'>
                  {rightHtml}
                </div>
              </div>
              <!--<![endif]-->";
        }

        private static string BuildDetailFieldRows(IReadOnlyList<(string Cid, string Label, string ValueHtml)> fields)
        {
            var sb = new StringBuilder();
            sb.Append("<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'>");
            for (var i = 0; i < fields.Count; i++)
            {
                var (cid, label, valueHtml) = fields[i];
                sb.Append($@"
                <tr>
                  <td valign='top' width='32' style='width:32px;padding:0 8px 11px 0;'>
                    <img src='cid:{cid}' width='24' height='24' alt='' style='display:block;width:24px;height:24px;border:0;' />
                  </td>
                  <td valign='top' width='90' style='width:90px;padding:3px 6px 11px 0;font-size:12.5px;font-weight:700;color:#475569;line-height:1.35;'>
                    {WebUtility.HtmlEncode(label)}
                  </td>
                  <td valign='top' style='padding:3px 0 11px 0;font-size:13px;color:#0f172a;line-height:1.45;word-break:break-word;overflow-wrap:anywhere;'>
                    {valueHtml}
                  </td>
                </tr>");
            }
            sb.Append("</table>");
            return sb.ToString();
        }

        private static string WrapResponsiveEmailDocument(string title, string preheader, string innerRowsHtml)
        {
            var safeTitle = WebUtility.HtmlEncode(title);
            return $@"<!DOCTYPE html>
<html lang='en' xmlns='http://www.w3.org/1999/xhtml'>
<head>
  <meta charset='utf-8' />
  <meta name='viewport' content='width=device-width, initial-scale=1.0' />
  <meta http-equiv='X-UA-Compatible' content='IE=edge' />
  <meta name='x-apple-disable-message-reformatting' />
  <title>{safeTitle}</title>
  <style type='text/css'>
    body, table, td, p, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
    table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }}
    img {{ -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }}
    @media only screen and (max-width: 620px) {{
      .outer-pad {{ padding: 10px 6px !important; }}
      .email-shell {{ border-radius: 10px !important; }}
      .mob-pad {{ padding: 16px 15px !important; }}
      .mob-card-pad {{ padding: 14px 12px !important; }}
      .email-col {{ display: block !important; width: 100% !important; max-width: 100% !important; }}
      .col-pad-left {{ padding-right: 0 !important; }}
      .col-pad-right {{ padding-left: 0 !important; padding-top: 2px !important; }}
      .mob-stack-td {{ display: block !important; width: 100% !important; box-sizing: border-box !important; }}
      .mob-center {{ text-align: center !important; }}
      .mob-left {{ text-align: left !important; }}
      .mob-hide {{ display: none !important; }}
      .mob-hero-title {{ font-size: 22px !important; line-height: 1.24 !important; }}
      .mob-hero-img {{ width: 100% !important; max-width: 230px !important; height: auto !important; margin: 14px auto 0 auto !important; }}
      .mob-header-links {{ text-align: left !important; padding-top: 8px !important; font-size: 11.5px !important; }}
      .mob-ref-row {{ padding-top: 10px !important; }}
      .mob-cta {{ display: block !important; width: 100% !important; max-width: 280px !important; margin: 0 auto !important; box-sizing: border-box !important; }}
      .mob-logo {{ width: 122px !important; height: auto !important; }}
    }}
  </style>
</head>
<body style='margin:0;padding:0;background-color:#edf2f7;font-family:-apple-system,BlinkMacSystemFont,""Segoe UI"",Roboto,Helvetica,Arial,sans-serif;color:#0f172a;'>
  <div style='display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;'>{preheader}</div>
  <table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0' bgcolor='#edf2f7' style='background-color:#edf2f7;width:100%;'>
    <tr>
      <td align='center' class='outer-pad' style='padding:24px 12px;'>
        <!--[if mso]>
        <table role='presentation' width='640' align='center' cellpadding='0' cellspacing='0' border='0'><tr><td>
        <![endif]-->
        <table role='presentation' class='email-shell' width='100%' cellpadding='0' cellspacing='0' border='0' style='max-width:640px;width:100%;margin:0 auto;background-color:#ffffff;border-radius:14px;border:1px solid #d5e1ec;overflow:hidden;'>
          {innerRowsHtml}
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>";
        }
    }
}
