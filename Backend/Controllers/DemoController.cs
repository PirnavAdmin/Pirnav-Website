using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Pirnav.API.DTOs;
using Pirnav.API.Helpers;
using Pirnav.API.Models;
using Pirnav.API.Services;

namespace Pirnav.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DemoController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly DemoService _demoService;
        private readonly ILogger<DemoController> _logger;

        public DemoController(
            AppDbContext context,
            DemoService demoService,
            ILogger<DemoController> logger)
        {
            _context = context;
            _demoService = demoService;
            _logger = logger;
        }

        // ================= PUBLIC: PRODUCT CATALOG =================

        [AllowAnonymous]
        [HttpGet("products")]
        public IActionResult GetProducts()
        {
            return Ok(DemoProductCatalog.All);
        }

        // ================= PUBLIC: SUBMIT DEMO REQUEST =================

        [AllowAnonymous]
        [EnableRateLimiting("demoLimiter")]
        [HttpPost]
        public async Task<IActionResult> SubmitDemoRequest([FromBody] DemoRequestDto dto)
        {
            // Bot honeypot check: silently succeed without storing or emailing
            if (!string.IsNullOrWhiteSpace(dto.Website))
            {
                _logger.LogWarning("Demo request bot submission ignored.");
                return Ok(new
                {
                    success = true,
                    message = "Demo request received successfully."
                });
            }

            var product = DemoProductCatalog.Resolve(dto.ProductId);
            if (product == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Selected product is invalid."
                });
            }

            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
            if (EmailHelper.IsBlockedDomain(normalizedEmail))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Temporary email addresses are not allowed."
                });
            }

            if (EmailHelper.IsSpamContent(dto.Message) || EmailHelper.IsSpamContent(dto.Company))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Spam content detected."
                });
            }

            // Duplicate check: same email + same product within the last 24 hours (unless marked Lost)
            var cutoff = DateTime.UtcNow.AddHours(-24);
            var duplicate = await _context.DemoRequests
                .AsNoTracking()
                .Where(d =>
                    d.Email == normalizedEmail &&
                    d.ProductId == product.Id &&
                    d.Status != "Lost" &&
                    d.CreatedAt >= cutoff)
                .OrderByDescending(d => d.CreatedAt)
                .Select(d => new { d.ReferenceNumber })
                .FirstOrDefaultAsync();

            if (duplicate != null)
            {
                return Conflict(new
                {
                    success = false,
                    duplicate = true,
                    referenceNumber = duplicate.ReferenceNumber,
                    message = $"A demo request for {product.ShortName} from this email was already received (Ref: {duplicate.ReferenceNumber})."
                });
            }

            var created = await _demoService.CreateDemoRequestAsync(dto, product);

            _logger.LogInformation(
                "Demo request {ReferenceNumber} created for Product {ProductId}.",
                created.ReferenceNumber,
                created.ProductId);

            return CreatedAtAction(
                nameof(GetDemoById),
                new { id = created.Id },
                new
                {
                    success = true,
                    id = created.Id,
                    referenceNumber = created.ReferenceNumber,
                    productId = created.ProductId,
                    productName = created.ProductName,
                    status = created.Status,
                    createdAt = created.CreatedAt,
                    message = "Demo request submitted successfully."
                });
        }

        // ================= ADMIN: PAGINATED LIST + SUMMARY =================

        [Authorize(Roles = "Admin, SuperAdmin")]
        [HttpGet]
        public async Task<IActionResult> GetDemos(
            string? productId = null,
            string? status = null,
            int? assignedToUserId = null,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            string? search = null,
            int page = 1,
            int pageSize = 10)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var allQuery = _context.DemoRequests.AsNoTracking();

            var summary = new
            {
                total = await allQuery.CountAsync(),
                newRequests = await allQuery.CountAsync(d => d.Status == "New"),
                contacted = await allQuery.CountAsync(d => d.Status == "Contacted"),
                demoScheduled = await allQuery.CountAsync(d => d.Status == "Demo Scheduled"),
                demosCompleted = await allQuery.CountAsync(d => d.Status == "Demo Completed"),
                qualified = await allQuery.CountAsync(d => d.Status == "Qualified"),
                converted = await allQuery.CountAsync(d => d.Status == "Converted"),
                lost = await allQuery.CountAsync(d => d.Status == "Lost")
            };

            var query = _context.DemoRequests
                .AsNoTracking()
                .Include(d => d.AssignedToUser)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(productId) && !string.Equals(productId, "all", StringComparison.OrdinalIgnoreCase))
            {
                var resolved = DemoProductCatalog.Resolve(productId);
                var pid = resolved?.Id ?? productId.Trim();
                query = query.Where(d => d.ProductId == pid);
            }

            if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
            {
                var trimmedStatus = status.Trim();
                query = query.Where(d => d.Status == trimmedStatus);
            }

            if (assignedToUserId.HasValue)
            {
                if (assignedToUserId.Value == 0)
                    query = query.Where(d => d.AssignedToUserId == null);
                else
                    query = query.Where(d => d.AssignedToUserId == assignedToUserId.Value);
            }

            if (fromDate.HasValue)
            {
                var start = fromDate.Value.Date;
                query = query.Where(d => d.CreatedAt >= start);
            }

            if (toDate.HasValue)
            {
                var end = toDate.Value.Date.AddDays(1);
                query = query.Where(d => d.CreatedAt < end);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(d =>
                    d.ReferenceNumber.Contains(term) ||
                    d.Name.Contains(term) ||
                    d.Email.Contains(term) ||
                    d.Company.Contains(term) ||
                    d.ProductName.Contains(term));
            }

            var totalFiltered = await query.CountAsync();
            var items = await query
                .OrderByDescending(d => d.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(d => new
                {
                    d.Id,
                    d.ReferenceNumber,
                    d.ProductId,
                    d.ProductName,
                    d.Name,
                    d.Email,
                    d.Phone,
                    d.Company,
                    d.PreferredDemoDate,
                    d.Status,
                    d.AssignedToUserId,
                    AssignedToUsername = d.AssignedToUser != null ? d.AssignedToUser.Username : null,
                    d.FollowUpDate,
                    d.CreatedAt,
                    d.UpdatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                summary,
                page,
                pageSize,
                totalRecords = totalFiltered,
                totalPages = Math.Max(1, (int)Math.Ceiling((double)totalFiltered / pageSize)),
                items
            });
        }

        // ================= ADMIN: DETAILS =================

        [Authorize(Roles = "Admin, SuperAdmin")]
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetDemoById(int id)
        {
            var demo = await _context.DemoRequests
                .AsNoTracking()
                .Include(d => d.AssignedToUser)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (demo == null)
                return NotFound(new { success = false, message = "Demo request not found." });

            var activities = await _context.DemoActivities
                .AsNoTracking()
                .Where(a => a.DemoRequestId == id)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new
                {
                    a.Id,
                    a.ActivityType,
                    a.PreviousStatus,
                    a.NewStatus,
                    a.Notes,
                    a.EmployeeId,
                    a.EmployeeName,
                    a.FollowUpDate,
                    a.CreatedAt
                })
                .ToListAsync();

            var emails = await _context.EmailOutboxes
                .AsNoTracking()
                .Where(e => e.RelatedDemoRequestId == id)
                .OrderByDescending(e => e.CreatedAt)
                .Select(e => new
                {
                    e.Id,
                    e.EmailType,
                    e.RecipientEmail,
                    e.SenderEmail,
                    e.Subject,
                    e.DeliveryStatus,
                    e.AttemptCount,
                    e.LastError,
                    e.NextRetryAt,
                    e.CreatedAt,
                    e.SentAt
                })
                .ToListAsync();

            return Ok(new
            {
                demo.Id,
                demo.ReferenceNumber,
                demo.ProductId,
                demo.ProductName,
                demo.Name,
                demo.Email,
                demo.Phone,
                demo.Company,
                demo.Message,
                demo.PreferredDemoDate,
                demo.Status,
                demo.AssignedToUserId,
                AssignedToUsername = demo.AssignedToUser?.Username,
                AssignedToEmail = demo.AssignedToUser?.Email,
                demo.FollowUpDate,
                demo.CreatedAt,
                demo.UpdatedAt,
                activities,
                outboxEmails = emails
            });
        }

        // ================= ADMIN: UPDATE STATUS =================

        [Authorize(Roles = "Admin, SuperAdmin")]
        [HttpPut("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateDemoStatusDto dto)
        {
            if (!DemoProductCatalog.IsValidStatus(dto.Status, out var canonicalStatus))
            {
                return BadRequest(new
                {
                    success = false,
                    message = $"Invalid status. Allowed values: {string.Join(", ", DemoProductCatalog.ValidStatuses)}"
                });
            }

            var demo = await _context.DemoRequests.FindAsync(id);
            if (demo == null)
                return NotFound(new { success = false, message = "Demo request not found." });

            var (actorId, actorName) = GetActorInfo();
            var previousStatus = demo.Status;
            var now = DateTime.UtcNow;

            demo.Status = canonicalStatus;
            demo.UpdatedAt = now;
            if (dto.FollowUpDate.HasValue)
                demo.FollowUpDate = dto.FollowUpDate;

            var note = string.IsNullOrWhiteSpace(dto.Notes)
                ? $"Status updated from {previousStatus} to {canonicalStatus}."
                : InputSanitizer.Clean(dto.Notes.Trim());

            _context.DemoActivities.Add(new DemoActivity
            {
                DemoRequestId = demo.Id,
                ActivityType = "StatusChanged",
                PreviousStatus = previousStatus,
                NewStatus = canonicalStatus,
                Notes = note,
                EmployeeId = actorId,
                EmployeeName = actorName,
                FollowUpDate = dto.FollowUpDate,
                CreatedAt = now
            });

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Audit: Demo {ReferenceNumber} status updated from {PreviousStatus} to {NewStatus} by UserId {ActorUserId}.",
                demo.ReferenceNumber,
                previousStatus,
                canonicalStatus,
                actorId);

            return Ok(new
            {
                success = true,
                status = demo.Status,
                followUpDate = demo.FollowUpDate,
                updatedAt = demo.UpdatedAt,
                message = "Status updated successfully."
            });
        }

        // ================= ADMIN: ASSIGN EMPLOYEE =================

        [Authorize(Roles = "Admin, SuperAdmin")]
        [HttpPut("{id:int}/assign")]
        public async Task<IActionResult> AssignEmployee(int id, [FromBody] AssignDemoDto dto)
        {
            var demo = await _context.DemoRequests.FindAsync(id);
            if (demo == null)
                return NotFound(new { success = false, message = "Demo request not found." });

            AdminUser? assignee = null;
            if (dto.AssignedToUserId.HasValue)
            {
                assignee = await _context.AdminUsers.FindAsync(dto.AssignedToUserId.Value);
                if (assignee == null)
                    return BadRequest(new { success = false, message = "Selected employee/admin not found." });
            }

            var (actorId, actorName) = GetActorInfo();
            var now = DateTime.UtcNow;

            demo.AssignedToUserId = assignee?.Id;
            demo.UpdatedAt = now;
            if (dto.FollowUpDate.HasValue)
                demo.FollowUpDate = dto.FollowUpDate;

            var defaultNote = assignee != null
                ? $"Assigned demo lead to {assignee.Username}."
                : "Unassigned demo lead.";

            var note = string.IsNullOrWhiteSpace(dto.Notes)
                ? defaultNote
                : InputSanitizer.Clean(dto.Notes.Trim());

            _context.DemoActivities.Add(new DemoActivity
            {
                DemoRequestId = demo.Id,
                ActivityType = "Assigned",
                PreviousStatus = demo.Status,
                NewStatus = demo.Status,
                Notes = note,
                EmployeeId = assignee?.Id ?? actorId,
                EmployeeName = assignee?.Username ?? actorName,
                FollowUpDate = dto.FollowUpDate,
                CreatedAt = now
            });

            if (assignee != null && !string.IsNullOrWhiteSpace(assignee.Email))
            {
                var product = DemoProductCatalog.Resolve(demo.ProductId)
                    ?? new DemoProductInfo(demo.ProductId, demo.ProductName, demo.ProductName, "Product");
                _context.EmailOutboxes.Add(_demoService.BuildAssignmentNotification(demo, product, assignee, actorName));
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Audit: Demo {ReferenceNumber} assigned to UserId {AssigneeId} by UserId {ActorUserId}.",
                demo.ReferenceNumber,
                assignee?.Id,
                actorId);

            return Ok(new
            {
                success = true,
                assignedToUserId = demo.AssignedToUserId,
                assignedToUsername = assignee?.Username,
                followUpDate = demo.FollowUpDate,
                updatedAt = demo.UpdatedAt,
                message = assignee != null ? $"Assigned to {assignee.Username}." : "Lead unassigned."
            });
        }

        // ================= ADMIN: ADD & VIEW ACTIVITIES =================

        [Authorize(Roles = "Admin, SuperAdmin")]
        [HttpGet("{id:int}/activities")]
        public async Task<IActionResult> GetActivities(int id)
        {
            var exists = await _context.DemoRequests.AnyAsync(d => d.Id == id);
            if (!exists)
                return NotFound(new { success = false, message = "Demo request not found." });

            var activities = await _context.DemoActivities
                .AsNoTracking()
                .Where(a => a.DemoRequestId == id)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            return Ok(activities);
        }

        [Authorize(Roles = "Admin, SuperAdmin")]
        [HttpPost("{id:int}/activities")]
        public async Task<IActionResult> AddActivity(int id, [FromBody] AddDemoActivityDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Notes))
                return BadRequest(new { success = false, message = "Notes are required." });

            var demo = await _context.DemoRequests.FindAsync(id);
            if (demo == null)
                return NotFound(new { success = false, message = "Demo request not found." });

            var (actorId, actorName) = GetActorInfo();
            var now = DateTime.UtcNow;

            if (dto.FollowUpDate.HasValue)
                demo.FollowUpDate = dto.FollowUpDate;
            demo.UpdatedAt = now;

            var activityType = !string.IsNullOrWhiteSpace(dto.ActivityType)
                ? dto.ActivityType.Trim()
                : (dto.FollowUpDate.HasValue ? "FollowUpScheduled" : "NoteAdded");

            var activity = new DemoActivity
            {
                DemoRequestId = demo.Id,
                ActivityType = activityType,
                PreviousStatus = demo.Status,
                NewStatus = demo.Status,
                Notes = InputSanitizer.Clean(dto.Notes.Trim()),
                EmployeeId = actorId,
                EmployeeName = actorName,
                FollowUpDate = dto.FollowUpDate,
                CreatedAt = now
            };

            _context.DemoActivities.Add(activity);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                activity,
                followUpDate = demo.FollowUpDate,
                message = "Activity recorded."
            });
        }

        // ================= ADMIN: RETRY FAILED EMAILS =================

        [Authorize(Roles = "Admin, SuperAdmin")]
        [HttpPost("{id:int}/retry-emails")]
        public async Task<IActionResult> RetryOutboxEmails(int id)
        {
            var emails = await _context.EmailOutboxes
                .Where(e => e.RelatedDemoRequestId == id && e.DeliveryStatus != "Sent")
                .ToListAsync();

            if (emails.Count == 0)
                return Ok(new { success = true, retried = 0, message = "No failed or pending emails found." });

            foreach (var email in emails)
            {
                email.DeliveryStatus = "Pending";
                email.NextRetryAt = DateTime.UtcNow;
                if (email.AttemptCount >= email.MaxAttempts)
                    email.AttemptCount = email.MaxAttempts - 1;
            }

            await _context.SaveChangesAsync();

            return Ok(new { success = true, retried = emails.Count, message = "Outbox emails queued for immediate retry." });
        }

        private (int? UserId, string Name) GetActorInfo()
        {
            var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            int? userId = int.TryParse(idStr, out var parsed) ? parsed : null;
            var username = User.FindFirstValue("username") ?? User.FindFirstValue(ClaimTypes.Role) ?? "Admin";
            return (userId, username);
        }
    }
}
