using EducenAPI.DTOs.Profile;
using EducenAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EduCen.Controllers
{
    [Route("api/profile")]
    [ApiController]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly EducenV2Context _context;

        public ProfileController(EducenV2Context context)
        {
            _context = context;
        }

        // ================= GET CURRENT USER =================
        [HttpGet("me")]
        public IActionResult GetCurrentUser()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var user = _context.Users
                .Where(u => u.UserId.ToString() == userId)
                .Select(u => new
                {
                    u.UserId,
                    u.Username,
                    u.FullName,
                    u.RoleId
                })
                .FirstOrDefault();

            if (user == null)
                return NotFound(new { message = "User not found" });

            return Ok(user);
        }

        // ================= UPDATE PROFILE =================
        [HttpPut("update")]
        public IActionResult UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var user = _context.Users
                .FirstOrDefault(u => u.UserId.ToString() == userId);

            if (user == null)
                return NotFound(new { message = "User not found" });

            user.FullName = request.FullName;

            _context.SaveChanges();

            return Ok(new { message = "Profile updated successfully" });
        }

        // ================= CHANGE PASSWORD =================
        [HttpPut("change-password")]
        public IActionResult ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var user = _context.Users
                .FirstOrDefault(u => u.UserId.ToString() == userId);

            if (user == null)
                return NotFound(new { message = "User not found" });

            if (!BCrypt.Net.BCrypt.Verify(request.OldPassword, user.PasswordHash))
                return BadRequest(new { message = "Old password incorrect" });

            user.PasswordHash =
                BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            _context.SaveChanges();

            return Ok(new { message = "Password changed successfully" });
        }
    }
}