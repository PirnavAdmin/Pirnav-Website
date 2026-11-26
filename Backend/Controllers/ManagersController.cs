using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pirnav.API.Models;

namespace Pirnav.API.Controllers
{
    [Authorize(Roles = "Admin, SuperAdmin")]
    [ApiController]
    [Route("api/[controller]")]
    public class ManagersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ManagersController(AppDbContext context)
        {
            _context = context;
        }

        // GET ALL MANAGERS
        [HttpGet]
        public async Task<IActionResult> GetManagers()
        {
            var managers = await _context.Managers
                .Select(m => new
                {
                    m.Id,
                    m.Name,
                    m.Email
                })
                .ToListAsync();

            return Ok(managers);
        }
    }
}