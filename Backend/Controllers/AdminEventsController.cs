using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pirnav.API.DTOs;
using Pirnav.API.Helpers;
using Pirnav.API.Models;
using Pirnav.API.Services;

namespace Pirnav.API.Controllers
{
    [Authorize(Roles = "Admin, SuperAdmin")]
    [ApiController]
    [Route("api/Admin/Events")]
    public class AdminEventsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly EventService _eventService;
        private readonly FileUploadService _fileUploadService;
        private readonly ILogger<AdminEventsController> _logger;

        public AdminEventsController(
            AppDbContext context,
            EventService eventService,
            FileUploadService fileUploadService,
            ILogger<AdminEventsController> logger)
        {
            _context = context;
            _eventService = eventService;
            _fileUploadService = fileUploadService;
            _logger = logger;
        }

        // ================= LIST ALL EVENTS =================

        [HttpGet]
        public async Task<IActionResult> GetAllEvents(string? status = null, string? category = null, string? search = null)
        {
            var now = DateTime.UtcNow;
            var allQuery = _context.Events.AsNoTracking();

            var summary = new
            {
                total = await allQuery.CountAsync(),
                published = await allQuery.CountAsync(e => e.Status == "Published"),
                upcoming = await allQuery.CountAsync(e => e.Status == "Published" && e.EndDateTime >= now),
                past = await allQuery.CountAsync(e => e.Status == "Published" && e.EndDateTime < now),
                drafts = await allQuery.CountAsync(e => e.Status == "Draft"),
                totalRegistrations = await _context.EventRegistrations.CountAsync(r => r.AttendanceStatus != "Cancelled")
            };

            var query = _context.Events
                .AsNoTracking()
                .Include(e => e.Speakers.OrderBy(s => s.DisplayOrder))
                .Include(e => e.GalleryItems.OrderBy(g => g.DisplayOrder))
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
            {
                var st = status.Trim();
                query = query.Where(e => e.Status == st);
            }

            if (!string.IsNullOrWhiteSpace(category) && !string.Equals(category, "all", StringComparison.OrdinalIgnoreCase))
            {
                var cat = category.Trim();
                query = query.Where(e => e.Category == cat);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(e => e.Title.Contains(term) || e.Slug.Contains(term) || e.LocationOrPlatform.Contains(term));
            }

            var items = await query
                .OrderByDescending(e => e.StartDateTime)
                .Select(e => new
                {
                    e.Id,
                    e.Title,
                    e.Slug,
                    e.Category,
                    e.ShortDescription,
                    e.Description,
                    e.EventMode,
                    e.LocationOrPlatform,
                    e.MeetingLink,
                    e.StartDateTime,
                    e.EndDateTime,
                    e.Timezone,
                    e.BannerImageUrl,
                    e.Status,
                    e.IsFeatured,
                    e.IsRegistrationOpen,
                    e.MaxAttendees,
                    e.WhoShouldAttend,
                    e.AgendaJson,
                    e.HighlightsSummary,
                    e.RecordingUrl,
                    e.CreatedAt,
                    e.UpdatedAt,
                    IsPast = e.EndDateTime < now,
                    RegisteredCount = e.Registrations.Count(r => r.AttendanceStatus != "Cancelled"),
                    AttendedCount = e.Registrations.Count(r => r.AttendanceStatus == "Attended"),
                    Speakers = e.Speakers.Select(s => new
                    {
                        s.Id,
                        s.Name,
                        s.RoleTitle,
                        s.Organization,
                        s.Bio,
                        s.PhotoUrl,
                        s.DisplayOrder
                    }),
                    GalleryItems = e.GalleryItems.Select(g => new
                    {
                        g.Id,
                        g.MediaType,
                        g.MediaUrl,
                        g.Caption,
                        g.DisplayOrder
                    })
                })
                .ToListAsync();

            return Ok(new { summary, items });
        }

        // ================= CREATE EVENT =================

        [HttpPost]
        public async Task<IActionResult> CreateEvent([FromBody] CreateOrUpdateEventDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(new { success = false, message = "Event title is required." });

            if (dto.EndDateTime <= dto.StartDateTime)
                return BadRequest(new { success = false, message = "End date/time must be after start date/time." });

            var slug = await _eventService.GenerateUniqueSlugAsync(string.IsNullOrWhiteSpace(dto.Slug) ? dto.Title : dto.Slug);
            var now = DateTime.UtcNow;
            var (actorId, actorName) = GetActorInfo();

            var ev = new Event
            {
                Title = InputSanitizer.Clean(dto.Title.Trim()),
                Slug = slug,
                Category = EventService.ValidCategories.Contains(dto.Category) ? dto.Category : "Webinars",
                ShortDescription = InputSanitizer.Clean((dto.ShortDescription ?? "").Trim()),
                Description = InputSanitizer.Clean((dto.Description ?? "").Trim()),
                EventMode = EventService.ValidModes.Contains(dto.EventMode) ? dto.EventMode : "Online",
                LocationOrPlatform = InputSanitizer.Clean((dto.LocationOrPlatform ?? "").Trim()),
                MeetingLink = string.IsNullOrWhiteSpace(dto.MeetingLink) ? null : dto.MeetingLink.Trim(),
                StartDateTime = dto.StartDateTime,
                EndDateTime = dto.EndDateTime,
                Timezone = string.IsNullOrWhiteSpace(dto.Timezone) ? "IST (UTC+05:30)" : dto.Timezone.Trim(),
                BannerImageUrl = string.IsNullOrWhiteSpace(dto.BannerImageUrl) ? null : dto.BannerImageUrl.Trim(),
                Status = EventService.ValidStatuses.Contains(dto.Status) ? dto.Status : "Draft",
                IsFeatured = dto.IsFeatured,
                IsRegistrationOpen = dto.IsRegistrationOpen,
                MaxAttendees = dto.MaxAttendees,
                WhoShouldAttend = string.IsNullOrWhiteSpace(dto.WhoShouldAttend) ? null : InputSanitizer.Clean(dto.WhoShouldAttend.Trim()),
                AgendaJson = dto.AgendaItems != null ? JsonSerializer.Serialize(dto.AgendaItems) : null,
                HighlightsSummary = string.IsNullOrWhiteSpace(dto.HighlightsSummary) ? null : InputSanitizer.Clean(dto.HighlightsSummary.Trim()),
                RecordingUrl = string.IsNullOrWhiteSpace(dto.RecordingUrl) ? null : dto.RecordingUrl.Trim(),
                CreatedAt = now,
                UpdatedAt = now
            };

            if (dto.Speakers != null)
            {
                var order = 1;
                foreach (var sp in dto.Speakers.Where(s => !string.IsNullOrWhiteSpace(s.Name)))
                {
                    ev.Speakers.Add(new EventSpeaker
                    {
                        Name = InputSanitizer.Clean(sp.Name.Trim()),
                        RoleTitle = InputSanitizer.Clean((sp.RoleTitle ?? "").Trim()),
                        Organization = string.IsNullOrWhiteSpace(sp.Organization) ? null : InputSanitizer.Clean(sp.Organization.Trim()),
                        Bio = string.IsNullOrWhiteSpace(sp.Bio) ? null : InputSanitizer.Clean(sp.Bio.Trim()),
                        PhotoUrl = string.IsNullOrWhiteSpace(sp.PhotoUrl) ? null : sp.PhotoUrl.Trim(),
                        DisplayOrder = sp.DisplayOrder > 0 ? sp.DisplayOrder : order++
                    });
                }
            }

            ev.Activities.Add(new EventActivity
            {
                ActivityType = "Created",
                Notes = $"Event created ({ev.Status}).",
                EmployeeId = actorId,
                EmployeeName = actorName,
                CreatedAt = now
            });

            _context.Events.Add(ev);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Audit: Event {EventId} created by UserId {ActorUserId}.", ev.Id, actorId);

            return Ok(new { success = true, id = ev.Id, slug = ev.Slug, message = "Event created successfully." });
        }

        // ================= UPDATE EVENT =================

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateEvent(int id, [FromBody] CreateOrUpdateEventDto dto)
        {
            var ev = await _context.Events
                .Include(e => e.Speakers)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (ev == null)
                return NotFound(new { success = false, message = "Event not found." });

            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(new { success = false, message = "Event title is required." });

            if (dto.EndDateTime <= dto.StartDateTime)
                return BadRequest(new { success = false, message = "End date/time must be after start date/time." });

            var now = DateTime.UtcNow;
            var (actorId, actorName) = GetActorInfo();

            if (!string.IsNullOrWhiteSpace(dto.Slug) && !string.Equals(dto.Slug.Trim(), ev.Slug, StringComparison.OrdinalIgnoreCase))
            {
                ev.Slug = await _eventService.GenerateUniqueSlugAsync(dto.Slug, ev.Id);
            }

            ev.Title = InputSanitizer.Clean(dto.Title.Trim());
            ev.Category = EventService.ValidCategories.Contains(dto.Category) ? dto.Category : ev.Category;
            ev.ShortDescription = InputSanitizer.Clean((dto.ShortDescription ?? "").Trim());
            ev.Description = InputSanitizer.Clean((dto.Description ?? "").Trim());
            ev.EventMode = EventService.ValidModes.Contains(dto.EventMode) ? dto.EventMode : ev.EventMode;
            ev.LocationOrPlatform = InputSanitizer.Clean((dto.LocationOrPlatform ?? "").Trim());
            ev.MeetingLink = string.IsNullOrWhiteSpace(dto.MeetingLink) ? null : dto.MeetingLink.Trim();
            ev.StartDateTime = dto.StartDateTime;
            ev.EndDateTime = dto.EndDateTime;
            ev.Timezone = string.IsNullOrWhiteSpace(dto.Timezone) ? ev.Timezone : dto.Timezone.Trim();
            if (dto.BannerImageUrl != null)
                ev.BannerImageUrl = string.IsNullOrWhiteSpace(dto.BannerImageUrl) ? null : dto.BannerImageUrl.Trim();
            ev.Status = EventService.ValidStatuses.Contains(dto.Status) ? dto.Status : ev.Status;
            ev.IsFeatured = dto.IsFeatured;
            ev.IsRegistrationOpen = dto.IsRegistrationOpen;
            ev.MaxAttendees = dto.MaxAttendees;
            ev.WhoShouldAttend = string.IsNullOrWhiteSpace(dto.WhoShouldAttend) ? null : InputSanitizer.Clean(dto.WhoShouldAttend.Trim());
            ev.AgendaJson = dto.AgendaItems != null ? JsonSerializer.Serialize(dto.AgendaItems) : null;
            ev.HighlightsSummary = string.IsNullOrWhiteSpace(dto.HighlightsSummary) ? null : InputSanitizer.Clean(dto.HighlightsSummary.Trim());
            ev.RecordingUrl = string.IsNullOrWhiteSpace(dto.RecordingUrl) ? null : dto.RecordingUrl.Trim();
            ev.UpdatedAt = now;

            if (dto.Speakers != null)
            {
                _context.EventSpeakers.RemoveRange(ev.Speakers);
                var order = 1;
                foreach (var sp in dto.Speakers.Where(s => !string.IsNullOrWhiteSpace(s.Name)))
                {
                    ev.Speakers.Add(new EventSpeaker
                    {
                        Name = InputSanitizer.Clean(sp.Name.Trim()),
                        RoleTitle = InputSanitizer.Clean((sp.RoleTitle ?? "").Trim()),
                        Organization = string.IsNullOrWhiteSpace(sp.Organization) ? null : InputSanitizer.Clean(sp.Organization.Trim()),
                        Bio = string.IsNullOrWhiteSpace(sp.Bio) ? null : InputSanitizer.Clean(sp.Bio.Trim()),
                        PhotoUrl = string.IsNullOrWhiteSpace(sp.PhotoUrl) ? null : sp.PhotoUrl.Trim(),
                        DisplayOrder = sp.DisplayOrder > 0 ? sp.DisplayOrder : order++
                    });
                }
            }

            _context.EventActivities.Add(new EventActivity
            {
                EventId = ev.Id,
                ActivityType = "Updated",
                Notes = "Event details updated.",
                EmployeeId = actorId,
                EmployeeName = actorName,
                CreatedAt = now
            });

            await _context.SaveChangesAsync();

            return Ok(new { success = true, id = ev.Id, slug = ev.Slug, message = "Event updated successfully." });
        }

        // ================= PUBLISH / STATUS / REGISTRATION TOGGLE =================

        [HttpPut("{id:int}/publish")]
        public async Task<IActionResult> UpdatePublishState(int id, [FromBody] UpdateEventPublishDto dto)
        {
            var ev = await _context.Events.FindAsync(id);
            if (ev == null)
                return NotFound(new { success = false, message = "Event not found." });

            if (!EventService.ValidStatuses.Contains(dto.Status))
                return BadRequest(new { success = false, message = "Invalid event status." });

            var (actorId, actorName) = GetActorInfo();
            ev.Status = dto.Status;
            if (dto.IsRegistrationOpen.HasValue)
                ev.IsRegistrationOpen = dto.IsRegistrationOpen.Value;
            ev.UpdatedAt = DateTime.UtcNow;

            _context.EventActivities.Add(new EventActivity
            {
                EventId = ev.Id,
                ActivityType = "StatusChanged",
                Notes = $"Event status set to {ev.Status}, registration {(ev.IsRegistrationOpen ? "open" : "closed")}.",
                EmployeeId = actorId,
                EmployeeName = actorName,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return Ok(new { success = true, status = ev.Status, isRegistrationOpen = ev.IsRegistrationOpen });
        }

        // ================= DELETE EVENT =================

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteEvent(int id)
        {
            var ev = await _context.Events.FindAsync(id);
            if (ev == null)
                return NotFound(new { success = false, message = "Event not found." });

            _context.Events.Remove(ev);
            await _context.SaveChangesAsync();

            var (actorId, _) = GetActorInfo();
            _logger.LogInformation("Audit: Event {EventId} deleted by UserId {ActorUserId}.", id, actorId);

            return Ok(new { success = true, message = "Event deleted successfully." });
        }

        // ================= UPLOAD / REPLACE / CLEAR EVENT BANNER =================

        [HttpPost("{id:int}/banner")]
        public async Task<IActionResult> UploadBanner(int id, IFormFile file)
        {
            var ev = await _context.Events.FindAsync(id);
            if (ev == null)
                return NotFound(new { success = false, message = "Event not found." });

            var uploadedUrl = await _fileUploadService.UploadEventImageAsync(file, "banners");
            if (uploadedUrl == null)
                return BadRequest(new { success = false, message = "Invalid image file. Upload JPG, PNG, or WEBP up to 5 MB." });

            ev.BannerImageUrl = uploadedUrl;
            ev.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, bannerImageUrl = uploadedUrl });
        }

        [HttpDelete("{id:int}/banner")]
        public async Task<IActionResult> ClearBanner(int id)
        {
            var ev = await _context.Events.FindAsync(id);
            if (ev == null)
                return NotFound(new { success = false, message = "Event not found." });

            ev.BannerImageUrl = null;
            ev.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, bannerImageUrl = (string?)null });
        }

        // ================= UPLOAD / CLEAR SPEAKER PHOTO =================

        [HttpPost("{id:int}/speakers/{speakerId:int}/photo")]
        public async Task<IActionResult> UploadSpeakerPhoto(int id, int speakerId, IFormFile file)
        {
            var speaker = await _context.EventSpeakers.FirstOrDefaultAsync(s => s.Id == speakerId && s.EventId == id);
            if (speaker == null)
                return NotFound(new { success = false, message = "Speaker not found." });

            var uploadedUrl = await _fileUploadService.UploadEventImageAsync(file, "speakers");
            if (uploadedUrl == null)
                return BadRequest(new { success = false, message = "Invalid image file. Upload JPG, PNG, or WEBP up to 5 MB." });

            speaker.PhotoUrl = uploadedUrl;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, photoUrl = uploadedUrl });
        }

        [HttpDelete("{id:int}/speakers/{speakerId:int}/photo")]
        public async Task<IActionResult> ClearSpeakerPhoto(int id, int speakerId)
        {
            var speaker = await _context.EventSpeakers.FirstOrDefaultAsync(s => s.Id == speakerId && s.EventId == id);
            if (speaker == null)
                return NotFound(new { success = false, message = "Speaker not found." });

            speaker.PhotoUrl = null;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, photoUrl = (string?)null });
        }

        // ================= PAST EVENT GALLERY UPLOAD / VIDEO LINK / DELETE =================

        [HttpPost("{id:int}/gallery")]
        public async Task<IActionResult> UploadGalleryImage(int id, IFormFile file, [FromForm] string? caption)
        {
            var ev = await _context.Events.FindAsync(id);
            if (ev == null)
                return NotFound(new { success = false, message = "Event not found." });

            var uploadedUrl = await _fileUploadService.UploadEventImageAsync(file, "gallery");
            if (uploadedUrl == null)
                return BadRequest(new { success = false, message = "Invalid image file. Upload JPG, PNG, or WEBP up to 5 MB." });

            var nextOrder = await _context.EventGalleries.CountAsync(g => g.EventId == id) + 1;
            var item = new EventGallery
            {
                EventId = id,
                MediaType = "Image",
                MediaUrl = uploadedUrl,
                Caption = string.IsNullOrWhiteSpace(caption) ? null : InputSanitizer.Clean(caption.Trim()),
                DisplayOrder = nextOrder,
                CreatedAt = DateTime.UtcNow
            };

            _context.EventGalleries.Add(item);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, item });
        }

        [HttpPost("{id:int}/gallery/video")]
        public async Task<IActionResult> AddGalleryVideo(int id, [FromBody] AddEventVideoDto dto)
        {
            var ev = await _context.Events.FindAsync(id);
            if (ev == null)
                return NotFound(new { success = false, message = "Event not found." });

            if (string.IsNullOrWhiteSpace(dto.MediaUrl))
                return BadRequest(new { success = false, message = "Video URL is required." });

            var nextOrder = await _context.EventGalleries.CountAsync(g => g.EventId == id) + 1;
            var item = new EventGallery
            {
                EventId = id,
                MediaType = "Video",
                MediaUrl = dto.MediaUrl.Trim(),
                Caption = string.IsNullOrWhiteSpace(dto.Caption) ? null : InputSanitizer.Clean(dto.Caption.Trim()),
                DisplayOrder = nextOrder,
                CreatedAt = DateTime.UtcNow
            };

            _context.EventGalleries.Add(item);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, item });
        }

        [HttpDelete("gallery/{mediaId:int}")]
        public async Task<IActionResult> DeleteGalleryItem(int mediaId)
        {
            var item = await _context.EventGalleries.FindAsync(mediaId);
            if (item == null)
                return NotFound(new { success = false, message = "Gallery item not found." });

            _context.EventGalleries.Remove(item);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        // ================= REGISTRATIONS, ATTENDANCE & CSV EXPORT =================

        [HttpGet("registrations")]
        public async Task<IActionResult> GetAllRegistrations(int? eventId = null, string? attendanceStatus = null, string? search = null)
        {
            var query = _context.EventRegistrations
                .AsNoTracking()
                .Include(r => r.Event)
                .AsQueryable();

            if (eventId.HasValue && eventId.Value > 0)
                query = query.Where(r => r.EventId == eventId.Value);

            if (!string.IsNullOrWhiteSpace(attendanceStatus) && !string.Equals(attendanceStatus, "all", StringComparison.OrdinalIgnoreCase))
                query = query.Where(r => r.AttendanceStatus == attendanceStatus.Trim());

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(r =>
                    r.ReferenceNumber.Contains(term) ||
                    r.Name.Contains(term) ||
                    r.Email.Contains(term) ||
                    r.Company.Contains(term));
            }

            var items = await query
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.EventId,
                    EventTitle = r.Event != null ? r.Event.Title : "",
                    EventCategory = r.Event != null ? r.Event.Category : "",
                    r.ReferenceNumber,
                    r.Name,
                    r.Email,
                    r.Phone,
                    r.Company,
                    r.JobRole,
                    r.Notes,
                    r.AttendanceStatus,
                    r.CreatedAt
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpGet("{id:int}/registrations")]
        public async Task<IActionResult> GetEventRegistrations(int id)
        {
            var exists = await _context.Events.AnyAsync(e => e.Id == id);
            if (!exists)
                return NotFound(new { success = false, message = "Event not found." });

            var items = await _context.EventRegistrations
                .AsNoTracking()
                .Where(r => r.EventId == id)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Ok(items);
        }

        [HttpPut("registrations/{regId:int}/attendance")]
        public async Task<IActionResult> UpdateAttendance(int regId, [FromBody] UpdateAttendanceDto dto)
        {
            if (!EventService.ValidAttendanceStatuses.Contains(dto.AttendanceStatus))
                return BadRequest(new { success = false, message = "Invalid attendance status." });

            var reg = await _context.EventRegistrations.FindAsync(regId);
            if (reg == null)
                return NotFound(new { success = false, message = "Registration not found." });

            reg.AttendanceStatus = dto.AttendanceStatus;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, attendanceStatus = reg.AttendanceStatus });
        }

        [HttpGet("{id:int}/registrations/export")]
        public async Task<IActionResult> ExportRegistrations(int id)
        {
            var ev = await _context.Events.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
            if (ev == null)
                return NotFound(new { success = false, message = "Event not found." });

            var rows = await _context.EventRegistrations
                .AsNoTracking()
                .Where(r => r.EventId == id)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine("ReferenceNumber,Name,Email,Phone,Company,JobRole,AttendanceStatus,RegisteredAt");
            foreach (var r in rows)
            {
                sb.AppendLine(string.Join(",",
                    EventService.EscapeCsvCell(r.ReferenceNumber),
                    EventService.EscapeCsvCell(r.Name),
                    EventService.EscapeCsvCell(r.Email),
                    EventService.EscapeCsvCell(r.Phone),
                    EventService.EscapeCsvCell(r.Company),
                    EventService.EscapeCsvCell(r.JobRole),
                    EventService.EscapeCsvCell(r.AttendanceStatus),
                    EventService.EscapeCsvCell(r.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"))));
            }

            var (actorId, _) = GetActorInfo();
            _logger.LogInformation("Audit: Exported {Count} registrations for Event {EventId} by UserId {ActorUserId}.", rows.Count, id, actorId);

            return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", $"event-{ev.Slug}-registrations.csv");
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
