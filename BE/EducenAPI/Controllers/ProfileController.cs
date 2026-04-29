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
        private readonly AdminDbContext _adminDbContext;

        public ProfileController(EducenV2Context context, AdminDbContext adminDbContext)
        {
            _context = context;
            _adminDbContext = adminDbContext;
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
                return NotFound(new { message = "Không tìm thấy người dùng." });
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
                return NotFound(new { message = "Không tìm thấy người dùng." });
            }

            var normalizedUsername = request.Username?.Trim();
            var normalizedEmail = request.Email?.Trim();
            var normalizedPhone = request.PhoneNumber?.Trim();

            if (normalizedEmail != null)
            {
                if (string.IsNullOrWhiteSpace(normalizedEmail))
                {
                    return BadRequest(new { message = "Email không hợp lệ" });
                }

                var emailValidator = new EmailAddressAttribute();
                if (!emailValidator.IsValid(normalizedEmail))
                {
                    return BadRequest(new { message = "Email không hợp lệ" });
                }
            }

            if (normalizedPhone != null)
            {
                if (string.IsNullOrWhiteSpace(normalizedPhone))
                {
                    return BadRequest(new { message = "Số điện thoại không hợp lệ" });
                }

                var phoneRegex = new System.Text.RegularExpressions.Regex(@"^(0|\+84)[0-9]{9,10}$");
                if (!phoneRegex.IsMatch(normalizedPhone))
                {
                    return BadRequest(new { message = "Số điện thoại không hợp lệ. Phải bắt đầu bằng 0 hoặc +84 và có 10-11 chữ số." });
                }
            }

            if (normalizedUsername != null && normalizedUsername != user.Username)
            {
                var existingUser = _context.Users.Any(u => u.Username == normalizedUsername && u.UserId != userId);
                if (existingUser)
                {
                    return Conflict(new { message = "Tên đăng nhập đã tồn tại" });
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
                    return Conflict(new { message = "Email đã tồn tại" });
                }

                user.Email = normalizedEmail;

                // Sync with Tenant table if user is Admin (RoleId = 1)
                if (user.RoleId == 1)
                {
                    var tenantId = _context.CurrentTenantId;
                    if (!string.IsNullOrEmpty(tenantId))
                    {
                        var tenant = _adminDbContext.Tenants.FirstOrDefault(t => t.TenantId == tenantId);
                        if (tenant != null)
                        {
                            tenant.Email = normalizedEmail;
                            tenant.ContactPerson = user.FullName;
                            tenant.PhoneNumber = user.PhoneNumber;
                            tenant.Address = user.Address;
                        }
                    }
                }
            }

            if (normalizedPhone != null)
            {
                user.PhoneNumber = normalizedPhone;
            }

            if (request.Address != null)
            {
                user.Address = request.Address.Trim();
            }

            // After phone and address are updated on user, sync again to ensure latest values are captured if Admin
            if (user.RoleId == 1)
            {
                var tenantId = _context.CurrentTenantId;
                if (!string.IsNullOrEmpty(tenantId))
                {
                    var tenant = _adminDbContext.Tenants.FirstOrDefault(t => t.TenantId == tenantId);
                    if (tenant != null)
                    {
                        tenant.ContactPerson = user.FullName;
                        tenant.PhoneNumber = user.PhoneNumber;
                        tenant.Address = user.Address;
                    }
                }
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
            _adminDbContext.SaveChanges();

            return Ok(new { message = "Cập nhật hồ sơ thành công" });
        }

        [HttpPut("change-password")]
        public IActionResult ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var userId = User.FindFirst("UserId")?.Value;

            var user = _context.Users.FirstOrDefault(u => u.UserId.ToString() == userId);
            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy người dùng." });
            }

            if (!BCrypt.Net.BCrypt.Verify(request.OldPassword, user.PasswordHash))
            {
                return BadRequest(new { message = "Mật khẩu hiện tại không đúng" });
            }

            if (request.OldPassword == request.NewPassword)
            {
                return BadRequest(new { message = "Mật khẩu mới phải khác mật khẩu hiện tại" });
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            _context.SaveChanges();

            return Ok(new { message = "Đổi mật khẩu thành công" });
        }
    }
}
