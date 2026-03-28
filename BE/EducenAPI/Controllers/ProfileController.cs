using EducenAPI.DTOs.Profile;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Linq;

namespace EducenAPI.Controllers
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
            var userIdStr = User.FindFirst("UserId")?.Value;
            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized();

            var user = _context.Users
                .Include(u => u.Role)
                .Include(u => u.Teacher)
                .Include(u => u.Assistant)
                .Include(u => u.Student)
                    .ThenInclude(s => s.Parents)
                        .ThenInclude(p => p.ParentNavigation)
                .Include(u => u.Parent)
                    .ThenInclude(p => p.Students)
                        .ThenInclude(s => s.StudentNavigation)
                .FirstOrDefault(u => u.UserId == userId);

            if (user == null)
                return NotFound(new { message = "User not found" });

            // Build response with role-specific data
            var result = new
            {
                user.UserId,
                user.Username,
                user.FullName,
                user.Email,
                user.PhoneNumber,
                user.Address,
                user.RoleId,
                RoleName = user.Role?.RoleName,
                user.AccountStatus,
                // Teacher info
                Specialization = user.Teacher?.Specialization,
                Degree = user.Teacher?.Degree,
                // Assistant info
                SupportLevel = user.Assistant?.SupportLevel,
                // Student info
                Grade = user.Student?.Grade,
                EnrollmentStatus = user.Student?.EnrollmentStatus,
                DateOfBirth = user.Student?.DateOfBirth,
                Gender = user.Student?.Gender,
                ParentNames = user.Student?.Parents.Select(p => p.ParentNavigation?.FullName ?? p.ParentNavigation?.Username ?? "").ToList(),
                ParentIds = user.Student?.Parents.Select(p => p.UserId).ToList(),
                // Parent info
                StudentNames = user.Parent?.Students.Select(s => s.StudentNavigation?.FullName ?? s.StudentNavigation?.Username ?? "").ToList(),
                StudentIds = user.Parent?.Students.Select(s => s.UserId).ToList()
            };

            return Ok(result);
        }

        [HttpPut("update")]
        public IActionResult UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var userIdStr = User.FindFirst("UserId")?.Value;
            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized();

            var user = _context.Users
                .Include(u => u.Teacher)
                .Include(u => u.Student)
                .Include(u => u.Assistant)
                .FirstOrDefault(u => u.UserId == userId);

            if (user == null)
                return NotFound(new { message = "User not found" });

            // 1. Cập nhật Username (nếu thay đổi)
            if (request.Username != null && request.Username != user.Username)
            {
                var existingUser = _context.Users.Any(u => u.Username == request.Username && u.UserId != userId);
                if (existingUser)
                    return Conflict(new { message = "Tên đăng nhập đã tồn tại" });
                
                user.Username = request.Username.Trim();
            }

            // 2. Cập nhật FullName
            if (request.FullName != null)
                user.FullName = request.FullName.Trim();

            // 3. Cập nhật Email nếu có và không trùng
            if (request.Email != null)
            {
                var existingEmail = _context.Users
                    .Any(u => u.Email == request.Email && u.UserId != user.UserId);
                if (existingEmail)
                    return Conflict(new { message = "Email đã tồn tại" });
                
                user.Email = request.Email.Trim();
            }

            // 4. Cập nhật PhoneNumber nếu có
            if (request.PhoneNumber != null)
                user.PhoneNumber = request.PhoneNumber.Trim();

            // 5. Cập nhật Address
            if (request.Address != null)
                user.Address = request.Address.Trim();

            // 6. Cập nhật Role-specific fields
            if (user.Teacher != null)
            {
                if (request.Specialization != null) user.Teacher.Specialization = request.Specialization.Trim();
                if (request.Degree != null) user.Teacher.Degree = request.Degree.Trim();
            }

            if (user.Student != null)
            {
                if (request.DateOfBirth.HasValue) user.Student.DateOfBirth = request.DateOfBirth;
                if (request.Gender != null) user.Student.Gender = request.Gender.Trim();
            }

            if (user.Assistant != null)
            {
                if (request.SupportLevel != null) user.Assistant.SupportLevel = request.SupportLevel.Trim();
            }

            _context.SaveChanges();

            return Ok(new { message = "Cập nhật hồ sơ thành công" });
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

            // Validate: NewPassword must be different from OldPassword
            if (request.OldPassword == request.NewPassword)
                return BadRequest(new { message = "Mật khẩu mới phải khác mật khẩu hiện tại" });

            user.PasswordHash =
                BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            _context.SaveChanges();

            return Ok(new { message = "Đổi mật khẩu thành công" });
        }
    }
}