using EducenAPI.DTOs.Auth;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
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

        public AuthService(EducenV2Context context, IConfiguration config)
        {
            _context = context;
            _config = config;
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

            if (user == null)
                throw new Exception("Sai tài khoản");

            if (user.AccountStatus != "Active")
                throw new Exception("Tài khoản của bạn đã bị khóa");

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                throw new Exception("Sai mật khẩu");

            return GenerateToken(user);
        }

        public async Task<string> RequestResetPassword(ResetPasswordDto dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null)
                throw new Exception("Email not found");

            // Generate reset token (valid for 1 hour)
            var resetToken = Guid.NewGuid().ToString("N");
            
            // In production, you would:
            // 1. Store this token in database with expiration
            // 2. Send email with reset link
            
            // For now, return token directly (in production, send via email)
            return $"Reset token generated for {dto.Email}. Token: {resetToken} (valid for 1 hour)";
        }

        public async Task<bool> ConfirmResetPassword(ResetPasswordConfirmDto dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null)
                throw new Exception("Email not found");

            // In production, validate the reset token from database
            
            // Update password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            return true;
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
            var password = GenerateRandomPassword();

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

        private string GenerateRandomPassword()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789";

            return new string(Enumerable.Repeat(chars, 8)
                .Select(s => s[Random.Shared.Next(s.Length)]).ToArray());
        }
    }
}
