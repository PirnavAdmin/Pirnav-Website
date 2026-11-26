using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pirnav.API.Models;
using System.Security.Claims;

namespace Pirnav.API.Controllers
{
    [Authorize(Roles = "Admin, SuperAdmin")]
    [ApiController]
    [Route("api/[controller]")]
    public class LeadController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<LeadController> _logger;

        public LeadController(AppDbContext context, ILogger<LeadController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // 🔥 GET all leads (for admin page)
        [HttpGet]
        public async Task<IActionResult> GetLeads()
        {
            var leads = await _context.Leads
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            return Ok(leads);
        }


        //  update all leads (for admin page)

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateLead(int id, [FromBody] Lead updatedLead)
        {
            var lead = await _context.Leads.FindAsync(id);

            if (lead == null)
                return NotFound();

            lead.Name = updatedLead.Name;
            lead.Email = updatedLead.Email;
            lead.Requirement = updatedLead.Requirement;

            await _context.SaveChangesAsync();

            var (actorUserId, actorRole) = GetAuditActor();
            _logger.LogInformation(
                "Audit: Lead {LeadId} updated by UserId {ActorUserId} with role {ActorRole}.",
                id,
                actorUserId,
                actorRole);

            return Ok(lead);
        }


        // delete all leads (for admin page)

        [Authorize(Roles = "SuperAdmin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteLead(int id)
        {
            var lead = await _context.Leads.FindAsync(id);

            if (lead == null)
                return NotFound();

            _context.Leads.Remove(lead);
            await _context.SaveChangesAsync();

            var (actorUserId, actorRole) = GetAuditActor();
            _logger.LogInformation(
                "Audit: Lead {LeadId} deleted by UserId {ActorUserId} with role {ActorRole}.",
                id,
                actorUserId,
                actorRole);

            return Ok(new { message = "Lead deleted successfully" });
        }


        //export all leads for admin side

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("export")]
        public IActionResult ExportLeads()
        {
            var leads = _context.Leads.ToList();

            var (actorUserId, actorRole) = GetAuditActor();
            _logger.LogInformation(
                "Audit: Exported {LeadCount} leads by UserId {ActorUserId} with role {ActorRole}.",
                leads.Count,
                actorUserId,
                actorRole);

            var csv = "Name,Email,Requirement,CreatedAt\n";

            foreach (var lead in leads)
            {
                csv += $"{lead.Name},{lead.Email},{lead.Requirement},{lead.CreatedAt}\n";
            }

            var bytes = System.Text.Encoding.UTF8.GetBytes(csv);

            return File(bytes, "text/csv", "leads.csv");
        }

        private (string UserId, string Role) GetAuditActor()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
            var role = User.FindFirstValue(ClaimTypes.Role) ?? "unknown";
            return (userId, role);
        }
    }
}