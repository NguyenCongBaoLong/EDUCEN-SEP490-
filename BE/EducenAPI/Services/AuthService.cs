using EducenAPI.DTOs.Auth;
using EducenAPI.Models;
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

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                throw new Exception("Sai mật khẩu");

            return GenerateToken(user);
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
    }

}
