using EducenAPI.DTOs.Profile;
using EducenAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
            var userId = User.FindFirst("UserId")?.Value;

            var user = _context.Users
                .Include(u => u.Role)
                .Include(u => u.Teacher)
                .Include(u => u.Assistant)
                .Include(u => u.Student)
                .Include(u => u.Parent)
                .FirstOrDefault(u => u.UserId.ToString() == userId);

            if (user == null)
                return NotFound(new { message = "User not found" });

            // Build response with role-specific data
            var result = new
            {
                user.UserId,
                user.Username,
                user.FullName,
                user.RoleId,
                RoleName = user.Role?.RoleName,
                user.AccountStatus,
                // Teacher info
                Specialization = user.Teacher?.Specialization,
                Degree = user.Teacher?.Degree,
                // Assistant info
                SupportLevel = user.Assistant?.SupportLevel,
                // Student info
                Email = user.Student?.Email,
                PhoneNumber = user.Student?.PhoneNumber ?? user.Parent?.PhoneNumber,
                EnrollmentStatus = user.Student?.EnrollmentStatus,
                // Parent info
                Address = user.Parent?.Address
            };

            return Ok(result);
        }

        // ================= UPDATE PROFILE =================
        [HttpPut("update")]
        public IActionResult UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var userId = User.FindFirst("UserId")?.Value;

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
            var userId = User.FindFirst("UserId")?.Value;

            var user = _context.Users
                .FirstOrDefault(u => u.UserId.ToString() == userId);

            if (user == null)
                return NotFound(new { message = "User not found" });

            if (!BCrypt.Net.BCrypt.Verify(request.OldPassword, user.PasswordHash))
                return BadRequest(new { message = "Mật khẩu hiện tại không đúng" });

            user.PasswordHash =
                BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            _context.SaveChanges();

            return Ok(new { message = "Đổi mật khẩu thành công" });
        }
    }
}