using System.Text.Json;
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
    public class EventsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly EventService _eventService;
        private readonly ILogger<EventsController> _logger;

        public EventsController(AppDbContext context, EventService eventService, ILogger<EventsController> logger)
        {
            _context = context;
            _eventService = eventService;
            _logger = logger;
        }

        // ================= PUBLIC: LIST PUBLISHED EVENTS =================

        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> GetPublicEvents(
            string type = "all",
            string? category = null,
            bool? featured = null,
            string? search = null,
            int? limit = null)
        {
            var now = DateTime.UtcNow;

            var query = _context.Events
                .AsNoTracking()
                .Where(e => e.Status == "Published");

            if (!string.IsNullOrWhiteSpace(category) && !string.Equals(category, "all", StringComparison.OrdinalIgnoreCase))
            {
                var cat = category.Trim();
                query = query.Where(e => e.Category == cat);
            }

            if (featured.HasValue)
            {
                query = query.Where(e => e.IsFeatured == featured.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(e =>
                    e.Title.Contains(term) ||
                    e.ShortDescription.Contains(term) ||
                    e.Category.Contains(term) ||
                    e.LocationOrPlatform.Contains(term));
            }

            var normalizedType = type.Trim().ToLowerInvariant();
            if (normalizedType == "upcoming")
            {
                query = query.Where(e => e.EndDateTime >= now).OrderBy(e => e.StartDateTime);
            }
            else if (normalizedType == "past")
            {
                query = query.Where(e => e.EndDateTime < now).OrderByDescending(e => e.StartDateTime);
            }
            else
            {
                query = query.OrderBy(e => e.StartDateTime);
            }

            if (limit.HasValue && limit.Value > 0)
            {
                query = query.Take(Math.Min(limit.Value, 50));
            }

            var items = await query
                .Select(e => new
                {
                    e.Id,
                    e.Title,
                    e.Slug,
                    e.Category,
                    e.ShortDescription,
                    e.EventMode,
                    e.LocationOrPlatform,
                    e.StartDateTime,
                    e.EndDateTime,
                    e.Timezone,
                    e.BannerImageUrl,
                    e.IsFeatured,
                    e.IsRegistrationOpen,
                    e.MaxAttendees,
                    e.HighlightsSummary,
                    e.RecordingUrl,
                    IsPast = e.EndDateTime < now,
                    RegisteredCount = e.Registrations.Count(r => r.AttendanceStatus != "Cancelled"),
                    SpeakerCount = e.Speakers.Count,
                    GalleryCount = e.GalleryItems.Count
                })
                .ToListAsync();

            return Ok(items);
        }

        // ================= PUBLIC: EVENT DETAIL BY SLUG =================

        [AllowAnonymous]
        [HttpGet("{slug}")]
        public async Task<IActionResult> GetEventBySlug(string slug)
        {
            var ev = await _context.Events
                .AsNoTracking()
                .Include(e => e.Speakers.OrderBy(s => s.DisplayOrder))
                .Include(e => e.GalleryItems.OrderBy(g => g.DisplayOrder))
                .FirstOrDefaultAsync(e => e.Slug == slug && e.Status == "Published");

            if (ev == null)
                return NotFound(new { success = false, message = "Event not found." });

            var registeredCount = await _context.EventRegistrations
                .CountAsync(r => r.EventId == ev.Id && r.AttendanceStatus != "Cancelled");

            var isPast = ev.EndDateTime < DateTime.UtcNow;
            var isFull = ev.MaxAttendees.HasValue && registeredCount >= ev.MaxAttendees.Value;
            var ctaState = isPast
                ? "ViewHighlights"
                : (!ev.IsRegistrationOpen ? "RegistrationClosed" : (isFull ? "CapacityFull" : "RegisterNow"));

            var agendaItems = new List<EventAgendaItemDto>();
            if (!string.IsNullOrWhiteSpace(ev.AgendaJson))
            {
                try
                {
                    agendaItems = JsonSerializer.Deserialize<List<EventAgendaItemDto>>(ev.AgendaJson) ?? new();
                }
                catch
                {
                    agendaItems = new();
                }
            }

            return Ok(new
            {
                ev.Id,
                ev.Title,
                ev.Slug,
                ev.Category,
                ev.ShortDescription,
                ev.Description,
                ev.EventMode,
                ev.LocationOrPlatform,
                ev.StartDateTime,
                ev.EndDateTime,
                ev.Timezone,
                ev.BannerImageUrl,
                ev.IsFeatured,
                ev.IsRegistrationOpen,
                ev.MaxAttendees,
                ev.WhoShouldAttend,
                ev.HighlightsSummary,
                ev.RecordingUrl,
                IsPast = isPast,
                RegisteredCount = registeredCount,
                SpotsRemaining = ev.MaxAttendees.HasValue ? Math.Max(0, ev.MaxAttendees.Value - registeredCount) : (int?)null,
                CtaState = ctaState,
                AgendaItems = agendaItems,
                Speakers = ev.Speakers.Select(s => new
                {
                    s.Id,
                    s.Name,
                    s.RoleTitle,
                    s.Organization,
                    s.Bio,
                    s.PhotoUrl
                }),
                GalleryItems = ev.GalleryItems.Select(g => new
                {
                    g.Id,
                    g.MediaType,
                    g.MediaUrl,
                    g.Caption
                })
            });
        }

        // ================= PUBLIC: REGISTER FOR EVENT =================

        [AllowAnonymous]
        [EnableRateLimiting("eventRegisterLimiter")]
        [HttpPost("{id:int}/register")]
        public async Task<IActionResult> RegisterForEvent(int id, [FromBody] EventRegistrationDto dto)
        {
            if (!string.IsNullOrWhiteSpace(dto.Website))
            {
                _logger.LogWarning("Event registration bot submission ignored for Event {EventId}.", id);
                return Ok(new { success = true, message = "Registration received successfully." });
            }

            var ev = await _context.Events.FirstOrDefaultAsync(e => e.Id == id && e.Status == "Published");
            if (ev == null)
                return NotFound(new { success = false, message = "Event not found or no longer published." });

            if (ev.EndDateTime < DateTime.UtcNow)
                return BadRequest(new { success = false, message = "This event has already concluded." });

            if (!ev.IsRegistrationOpen)
                return BadRequest(new { success = false, message = "Registration for this event is closed." });

            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
            if (EmailHelper.IsBlockedDomain(normalizedEmail))
                return BadRequest(new { success = false, message = "Temporary email addresses are not allowed." });

            if (EmailHelper.IsSpamContent(dto.Notes ?? "") || EmailHelper.IsSpamContent(dto.Company))
                return BadRequest(new { success = false, message = "Spam content detected." });

            var existing = await _context.EventRegistrations
                .AsNoTracking()
                .Where(r => r.EventId == ev.Id && r.Email == normalizedEmail && r.AttendanceStatus != "Cancelled")
                .Select(r => new { r.ReferenceNumber })
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                return Conflict(new
                {
                    success = false,
                    duplicate = true,
                    referenceNumber = existing.ReferenceNumber,
                    message = $"You are already registered for this event (Ref: {existing.ReferenceNumber})."
                });
            }

            if (ev.MaxAttendees.HasValue)
            {
                var currentCount = await _context.EventRegistrations
                    .CountAsync(r => r.EventId == ev.Id && r.AttendanceStatus != "Cancelled");
                if (currentCount >= ev.MaxAttendees.Value)
                {
                    return BadRequest(new { success = false, message = "This event has reached maximum capacity." });
                }
            }

            var registration = await _eventService.RegisterVisitorAsync(ev, dto);

            _logger.LogInformation(
                "Event registration {ReferenceNumber} created for EventId {EventId}.",
                registration.ReferenceNumber,
                ev.Id);

            return CreatedAtAction(
                nameof(GetEventBySlug),
                new { slug = ev.Slug },
                new
                {
                    success = true,
                    id = registration.Id,
                    referenceNumber = registration.ReferenceNumber,
                    eventTitle = ev.Title,
                    startDateTime = ev.StartDateTime,
                    timezone = ev.Timezone,
                    message = "You are registered! Confirmation details have been queued to your email."
                });
        }
    }
}
