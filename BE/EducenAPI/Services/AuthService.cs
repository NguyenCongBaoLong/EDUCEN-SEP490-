using EducenAPI.DTOs.Auth;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
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

            // Unified message to prevent email enumeration
            // If email exists, token will be generated (but not revealed in response)
            if (user == null)
            {
                // Still return success to prevent email enumeration
                // In production: Send email with reset link regardless
                return "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi";
            }

            // Generate reset token (valid for 1 hour)
            var resetToken = Guid.NewGuid().ToString("N");
            
            // In production, you would:
            // 1. Store this token in database with expiration
            // 2. Send email with reset link containing the token
            
            // TODO: Store token in database with expiration (PasswordResetToken table)
            // Example:
            // var resetRecord = new PasswordResetToken {
            //     UserId = user.UserId,
            //     Token = resetToken,
            //     ExpiresAt = DateTime.UtcNow.AddHours(1),
            //     IsUsed = false
            // };
            // _context.PasswordResetTokens.Add(resetRecord);
            // await _context.SaveChangesAsync();
            
            // TODO: Send email with reset link
            // await _mailService.SendPasswordResetEmail(user.Email, resetToken);

            // For development: return message without exposing token
            return "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi";
        }

        public async Task<bool> ConfirmResetPassword(ResetPasswordConfirmDto dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null)
                throw new Exception("Email not found");

            // TODO: Validate the reset token from database
            // Example:
            // var resetToken = await _context.PasswordResetTokens
            //     .Where(t => t.UserId == user.UserId && t.Token == dto.Token && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
            //     .FirstOrDefaultAsync();
            // 
            // if (resetToken == null)
            //     throw new Exception("Invalid or expired reset token");
            //
            // // Mark token as used
            // resetToken.IsUsed = true;

            // Validate password meets requirements
            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
                throw new Exception("Password must be at least 6 characters");
            
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
