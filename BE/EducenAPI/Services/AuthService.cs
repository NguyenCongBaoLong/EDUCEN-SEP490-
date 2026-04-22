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
using Microsoft.AspNetCore.Http;
using Microsoft.Data.SqlClient;

namespace EducenAPI.Services
{
    public class AuthService : IAuthService
    {
        private readonly EducenV2Context _context;
        private readonly AdminDbContext _adminContext;
        private readonly IConfiguration _config;
        private readonly MailService _mailService;
        private readonly IMemoryCache _cache;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ICurrentTenantService _currentTenantService;

        public AuthService(EducenV2Context context, AdminDbContext adminContext, IConfiguration config, MailService mailService, IMemoryCache cache, IHttpContextAccessor httpContextAccessor, ICurrentTenantService currentTenantService)
        {
            _context = context;
            _adminContext = adminContext;
            _config = config;
            _mailService = mailService;
            _cache = cache;
            _httpContextAccessor = httpContextAccessor;
            _currentTenantService = currentTenantService;
        }

        public async Task Register(RegisterDto dto)
        {
            dto.Username = dto.Username?.Trim();
            dto.FullName = dto.FullName?.Trim();

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
            // Sử dụng ConnectionString của trung tâm hiện tại để kiểm tra tài khoản
            var currentConnStr = _currentTenantService.ConnectionString 
                ?? _config.GetConnectionString("DefaultTenantConnection");

            User? user = null;
            string roleName = string.Empty;

            using (var conn = new SqlConnection(currentConnStr))
            {
                await conn.OpenAsync();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    SELECT u.UserId, u.Username, u.PasswordHash, u.AccountStatus,
                           u.FullName, u.Email, u.RoleId, r.RoleName
                    FROM Users u
                    INNER JOIN Roles r ON u.RoleId = r.RoleId
                    WHERE u.Username = @Username";
                cmd.Parameters.AddWithValue("@Username", dto.Username);

                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    user = new User
                    {
                        UserId = reader.GetInt32(reader.GetOrdinal("UserId")),
                        Username = reader.GetString(reader.GetOrdinal("Username")),
                        PasswordHash = reader.GetString(reader.GetOrdinal("PasswordHash")),
                        AccountStatus = reader.GetString(reader.GetOrdinal("AccountStatus")),
                        FullName = reader.IsDBNull(reader.GetOrdinal("FullName")) ? null : reader.GetString(reader.GetOrdinal("FullName")),
                        Email = reader.IsDBNull(reader.GetOrdinal("Email")) ? null : reader.GetString(reader.GetOrdinal("Email")),
                        RoleId = reader.GetInt32(reader.GetOrdinal("RoleId")),
                        Role = new Role { RoleName = reader.GetString(reader.GetOrdinal("RoleName")) }
                    };
                }
            }

            // Unified error message to prevent username enumeration
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                throw new Exception("Tài khoản hoặc mật khẩu không đúng");

            if (user.AccountStatus != "Active")
                throw new Exception("Tài khoản của bạn đã bị khóa");

            // Resolve tenant from JWT claim, header, or middleware
            // Nếu không có tenant cụ thể → giữ "default-tenant" để dùng DB EducenV2 mặc định
            var resolvedTenantId = GetCurrentTenantId();

            return GenerateToken(user, resolvedTenantId);
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

        private string GenerateToken(User user, string? tenantIdOverride = null)
        {
            var jwt = _config.GetSection("Jwt");

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role.RoleName),
                new Claim("UserId", user.UserId.ToString()),
                new Claim("TenantId", tenantIdOverride ?? GetCurrentTenantId())
            };

            var jwtKey = jwt["Key"] ?? throw new InvalidOperationException("JWT Key chưa được cấu hình.");
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

        private string GetCurrentTenantId()
        {
            try
            {
                // Lấy tenantId từ header của request (TenantResolver middleware đã set)
                var httpContext = _httpContextAccessor.HttpContext;
                if (httpContext?.Items.ContainsKey("TenantId") == true)
                {
                    return httpContext.Items["TenantId"]?.ToString() ?? "default-tenant";
                }
                
                // Hoặc lấy từ header
                var tenantHeader = httpContext?.Request.Headers["tenant"].FirstOrDefault()
                    ?? httpContext?.Request.Headers["X-Tenant-Id"].FirstOrDefault();
                if (!string.IsNullOrEmpty(tenantHeader))
                {
                    return tenantHeader;
                }

                // Hoặc lấy từ query param ?tenant=
                var tenantQuery = httpContext?.Request.Query["tenant"].FirstOrDefault();
                if (!string.IsNullOrEmpty(tenantQuery))
                {
                    return tenantQuery;
                }
                
                return "default-tenant";
            }
            catch
            {
                return "default-tenant";
            }
        }

        public async Task<GeneratedAccountDto> GenerateStudentAccount(int studentId)
        {
            var student = await _context.Students
                .Include(s => s.StudentNavigation)
                .FirstOrDefaultAsync(s => s.UserId == studentId);

            if (student == null)
                throw new Exception("Không tìm thấy học sinh");

            var user = student.StudentNavigation;

            if (user == null)
                throw new Exception("Học sinh chưa được liên kết với tài khoản hệ thống");

            if (!string.IsNullOrEmpty(user.Username))
                throw new Exception("Học sinh này đã có tài khoản");

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
