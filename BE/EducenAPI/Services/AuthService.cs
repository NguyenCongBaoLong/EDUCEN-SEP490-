using EducenAPI.DTOs.Auth;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace EducenAPI.Services
{
    public class AuthService : IAuthService
    {
        private readonly EducenV2Context _context;
        private readonly IConfiguration _config;
        private readonly MailService _mailService;
        private readonly IMemoryCache _cache;

        public AuthService(EducenV2Context context, IConfiguration config, MailService mailService, IMemoryCache cache)
        {
            _context = context;
            _config = config;
            _mailService = mailService;
            _cache = cache;
        }

        public async Task Register(RegisterDto dto)
        {
            var exist = await _context.Users
                .AnyAsync(x => x.Username == dto.Username);

            if (exist)
                throw new Exception("Username đã tồn tại");

            var user = new User
            {
                Username = dto.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                RoleId = dto.RoleId,
                FullName = dto.FullName,
                AccountStatus = "Active"
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
        }

        public async Task<string> Login(LoginDto dto)
        {
            var user = await _context.Users
                .Include(x => x.Role)
                .FirstOrDefaultAsync(x => x.Username == dto.Username);

            // Unified error message to prevent username enumeration
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                throw new Exception("Tài khoản hoặc mật khẩu không đúng");

            if (user.AccountStatus != "Active")
                throw new Exception("Tài khoản của bạn đã bị khóa");

            return GenerateToken(user);
        }

        public async Task<string> RequestResetPassword(ResetPasswordDto dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            // Vẫn trả về thông báo thành công để bảo mật
            if (user == null)
            {
                return "Nếu email tồn tại trong hệ thống, mã xác thực 6 số sẽ được gửi.";
            }

            // TẠO MÃ 6 SỐ
            var resetCode = new Random().Next(100000, 999999).ToString();
            
            // Lưu vào Cache 15 phút (luôn dùng email viết thường để đồng bộ)
            var cleanEmail = user.Email?.Trim().ToLower();
            var cacheKey = $"ResetPassword_{cleanEmail}";
            _cache.Set(cacheKey, resetCode, TimeSpan.FromMinutes(15));
            
            // Gửi Email thật
            try 
            {
                await _mailService.SendResetPasswordEmail(user.Email ?? "", resetCode);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi gửi mail: {ex.Message}");
            }

            return "Nếu email tồn tại trong hệ thống, mã xác thực 6 số sẽ được gửi.";
        }

        public async Task<bool> ConfirmResetPassword(ResetPasswordConfirmDto dto)
        {
            try
            {
                // Làm sạch dữ liệu đầu vào
                var cleanEmail = dto.Email?.Trim().ToLower();
                var cleanCode = dto.ResetToken?.Trim();
                var cleanPassword = dto.NewPassword?.Trim();

                // Lấy mã từ Cache (luôn dùng email đã viết thường để làm key)
                var cacheKey = $"ResetPassword_{cleanEmail}";
                if (!_cache.TryGetValue(cacheKey, out string storedCode))
                {
                    throw new Exception("Mã xác thực đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.");
                }

                // Kiểm tra mã
                if (storedCode != cleanCode)
                {
                    throw new Exception("Mã xác thực không chính xác.");
                }

                // Tìm User (so sánh không phân biệt hoa thường)
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == cleanEmail);

                if (user == null)
                    throw new Exception($"Không tìm thấy người dùng có Email: {cleanEmail}");

                // Validate password
                if (string.IsNullOrWhiteSpace(cleanPassword) || cleanPassword.Length < 6)
                    throw new Exception("Mật khẩu mới phải có ít nhất 6 ký tự.");

                // Cập nhật mật khẩu mới
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(cleanPassword);
                
                await _context.SaveChangesAsync();

                // Xóa mã khỏi Cache sau khi thành công
                _cache.Remove(cacheKey);

                return true;
            }
            catch (Exception ex)
            {
                throw new Exception(ex.Message);
            }
        }

        private string GenerateToken(User user)
        {
            var jwt = _config.GetSection("Jwt");

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role.RoleName),
                new Claim("UserId", user.UserId.ToString())
            };

            var jwtKey = jwt["Key"] ?? throw new InvalidOperationException("JWT Key is not configured");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

            var expireMinutes = jwt["ExpireMinutes"] ?? "60";
            var token = new JwtSecurityToken(
                issuer: jwt["Issuer"],
                audience: jwt["Audience"],
                claims: claims,
                expires: DateTime.Now.AddMinutes(double.Parse(expireMinutes)),
                signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public async Task<GeneratedAccountDto> GenerateStudentAccount(int studentId)
        {
            var student = await _context.Students
                .Include(s => s.StudentNavigation)
                .FirstOrDefaultAsync(s => s.UserId == studentId);

            if (student == null)
                throw new Exception("Student not found");

            var user = student.StudentNavigation;

            if (user == null)
                throw new Exception("Student does not have a linked user account");

            if (!string.IsNullOrEmpty(user.Username))
                throw new Exception("Student already has an account");

            string username;
            bool exist;

            // Generate username using timestamp + check duplicate
            do
            {
                username = $"stu{studentId}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";

                exist = await _context.Users
                    .AnyAsync(x => x.Username == username);

                if (exist)
                {
                    await Task.Delay(1000);
                    // đợi 1 giây để timestamp khác
                }

            } while (exist);

            // Generate password
            var password = PasswordGenerator.GenerateSecurePassword();

            user.Username = username;
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
            user.AccountStatus = "Active";
            user.IsAccountSent = false;

            await _context.SaveChangesAsync();

            return new GeneratedAccountDto
            {
                Username = username,
                Password = password
            };
        }
    }
}
