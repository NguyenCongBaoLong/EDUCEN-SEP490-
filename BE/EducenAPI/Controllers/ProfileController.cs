using EducenAPI.DTOs.Profile;
using EducenAPI.Persistence.Contexts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

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

        [HttpGet("me")]
        public IActionResult GetCurrentUser()
        {
            var userIdStr = User.FindFirst("UserId")?.Value;
            if (!int.TryParse(userIdStr, out int userId))
            {
                return Unauthorized();
            }

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
            {
                return NotFound(new { message = "Khong tim thay nguoi dung." });
            }

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
                Specialization = user.Teacher?.Specialization,
                Degree = user.Teacher?.Degree,
                SupportLevel = user.Assistant?.SupportLevel,
                Grade = user.Student?.Grade,
                EnrollmentStatus = user.Student?.EnrollmentStatus,
                DateOfBirth = user.Student?.DateOfBirth,
                Gender = user.Student?.Gender,
                ParentNames = user.Student?.Parents.Select(p => p.ParentNavigation?.FullName ?? p.ParentNavigation?.Username ?? string.Empty).ToList(),
                ParentIds = user.Student?.Parents.Select(p => p.UserId).ToList(),
                StudentNames = user.Parent?.Students.Select(s => s.StudentNavigation?.FullName ?? s.StudentNavigation?.Username ?? string.Empty).ToList(),
                StudentIds = user.Parent?.Students.Select(s => s.UserId).ToList()
            };

            return Ok(result);
        }

        [HttpPut("update")]
        public IActionResult UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var userIdStr = User.FindFirst("UserId")?.Value;
            if (!int.TryParse(userIdStr, out int userId))
            {
                return Unauthorized();
            }

            var user = _context.Users
                .Include(u => u.Teacher)
                .Include(u => u.Student)
                .Include(u => u.Assistant)
                .FirstOrDefault(u => u.UserId == userId);

            if (user == null)
            {
                return NotFound(new { message = "Khong tim thay nguoi dung." });
            }

            var normalizedUsername = request.Username?.Trim();
            var normalizedEmail = request.Email?.Trim();
            var normalizedPhone = request.PhoneNumber?.Trim();

            if (normalizedEmail != null)
            {
                if (string.IsNullOrWhiteSpace(normalizedEmail))
                {
                    return BadRequest(new { message = "Email khong hop le" });
                }

                var emailValidator = new EmailAddressAttribute();
                if (!emailValidator.IsValid(normalizedEmail))
                {
                    return BadRequest(new { message = "Email khong hop le" });
                }
            }

            if (normalizedPhone != null)
            {
                if (string.IsNullOrWhiteSpace(normalizedPhone))
                {
                    return BadRequest(new { message = "So dien thoai khong hop le" });
                }

                var phoneRegex = new System.Text.RegularExpressions.Regex(@"^(0|\+84)[0-9]{9,10}$");
                if (!phoneRegex.IsMatch(normalizedPhone))
                {
                    return BadRequest(new { message = "So dien thoai khong hop le. Phai bat dau bang 0 hoac +84 va co 10-11 chu so." });
                }
            }

            if (normalizedUsername != null && normalizedUsername != user.Username)
            {
                var existingUser = _context.Users.Any(u => u.Username == normalizedUsername && u.UserId != userId);
                if (existingUser)
                {
                    return Conflict(new { message = "Ten dang nhap da ton tai" });
                }

                user.Username = normalizedUsername;
            }

            if (request.FullName != null)
            {
                user.FullName = request.FullName.Trim();
            }

            if (normalizedEmail != null)
            {
                var existingEmail = _context.Users.Any(u => u.Email == normalizedEmail && u.UserId != user.UserId);
                if (existingEmail)
                {
                    return Conflict(new { message = "Email da ton tai" });
                }

                user.Email = normalizedEmail;
            }

            if (normalizedPhone != null)
            {
                user.PhoneNumber = normalizedPhone;
            }

            if (request.Address != null)
            {
                user.Address = request.Address.Trim();
            }

            if (user.Teacher != null)
            {
                if (request.Specialization != null)
                {
                    user.Teacher.Specialization = request.Specialization.Trim();
                }

                if (request.Degree != null)
                {
                    user.Teacher.Degree = request.Degree.Trim();
                }
            }

            if (user.Student != null)
            {
                if (request.DateOfBirth.HasValue)
                {
                    user.Student.DateOfBirth = request.DateOfBirth;
                }

                if (request.Gender != null)
                {
                    user.Student.Gender = request.Gender.Trim();
                }
            }

            if (user.Assistant != null && request.SupportLevel != null)
            {
                user.Assistant.SupportLevel = request.SupportLevel.Trim();
            }

            _context.SaveChanges();

            return Ok(new { message = "Cap nhat ho so thanh cong" });
        }

        [HttpPut("change-password")]
        public IActionResult ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var userId = User.FindFirst("UserId")?.Value;

            var user = _context.Users.FirstOrDefault(u => u.UserId.ToString() == userId);
            if (user == null)
            {
                return NotFound(new { message = "Khong tim thay nguoi dung." });
            }

            if (!BCrypt.Net.BCrypt.Verify(request.OldPassword, user.PasswordHash))
            {
                return BadRequest(new { message = "Mat khau hien tai khong dung" });
            }

            if (request.OldPassword == request.NewPassword)
            {
                return BadRequest(new { message = "Mat khau moi phai khac mat khau hien tai" });
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            _context.SaveChanges();

            return Ok(new { message = "Doi mat khau thanh cong" });
        }
    }
}
