using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EducenAPI.Persistence.Contexts;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Controllers
{
    [Route("api/admin")]
    [ApiController]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly EducenV2Context _context;

        public AdminController(EducenV2Context context)
        {
            _context = context;
        }

        // PUT: api/admin/users/{id}/lock
        [HttpPut("users/{id:int}/lock")]
        public async Task<IActionResult> LockUserAccount(int id)
        {
            var user = await _context.Users.FindAsync(id);
            
            if (user == null)
                return NotFound(new { message = "User not found" });

            if (user.AccountStatus == "Locked")
                return BadRequest(new { message = "User account is already locked" });

            user.AccountStatus = "Locked";
            await _context.SaveChangesAsync();

            return Ok(new { message = "User account locked successfully", userId = id, status = "Locked" });
        }

        // PUT: api/admin/users/{id}/unlock
        [HttpPut("users/{id:int}/unlock")]
        public async Task<IActionResult> UnlockUserAccount(int id)
        {
            var user = await _context.Users.FindAsync(id);
            
            if (user == null)
                return NotFound(new { message = "User not found" });

            if (user.AccountStatus == "Active")
                return BadRequest(new { message = "User account is already active" });

            user.AccountStatus = "Active";
            await _context.SaveChangesAsync();

            return Ok(new { message = "User account unlocked successfully", userId = id, status = "Active" });
        }

        // GET: api/admin/users
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _context.Users
                .Include(u => u.Role)
                .Select(u => new
                {
                    u.UserId,
                    u.Username,
                    u.FullName,
                    u.Email,
                    u.PhoneNumber,
                    u.AccountStatus,
                    RoleName = u.Role.RoleName,
                    u.RoleId
                })
                .ToListAsync();

            return Ok(users);
        }

        // GET: api/admin/users/{id}
        [HttpGet("users/{id:int}")]
        public async Task<IActionResult> GetUserById(int id)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .Where(u => u.UserId == id)
                .Select(u => new
                {
                    u.UserId,
                    u.Username,
                    u.FullName,
                    u.Email,
                    u.PhoneNumber,
                    u.Address,
                    u.AccountStatus,
                    RoleName = u.Role.RoleName,
                    u.RoleId
                })
                .FirstOrDefaultAsync();

            if (user == null)
                return NotFound(new { message = "User not found" });

            return Ok(user);
        }
    }
}
