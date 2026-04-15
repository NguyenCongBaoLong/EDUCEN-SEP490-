using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;

namespace EducenAPI.Middleware
{
    public class SystemApiKeyMiddleware
    {
        private readonly RequestDelegate _next;
        private const string HEADER_NAME = "X-API-KEY";
        private readonly ILogger<SystemApiKeyMiddleware> _logger;

        public SystemApiKeyMiddleware(RequestDelegate next, ILogger<SystemApiKeyMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, IConfiguration configuration)
        {
            _logger.LogInformation($"[SystemApiKey] Path: {context.Request.Path}, Auth: {context.User?.Identity?.IsAuthenticated}");
            
            // Chỉ áp dụng cho API admin và refunds
            var isAdminApi = context.Request.Path.StartsWithSegments("/api/admin");
            var isRefundsApi = context.Request.Path.StartsWithSegments("/api/refunds");
            if (!isAdminApi && !isRefundsApi)
            {
                await _next(context);
                return;
            }

            // TEMPORARY: Skip API key check for all /api/admin/users endpoints for debugging
            if (context.Request.Path.StartsWithSegments("/api/admin/users"))
            {
                _logger.LogInformation($"[SystemApiKey] Allowing /api/admin/users endpoint without API key");
                await _next(context);
                return;
            }

            // Kiểm tra xem request đã được authenticate chưa (có JWT token)
            var isAuthenticated = context.User?.Identity?.IsAuthenticated ?? false;
            
            // Nếu đã authenticate với JWT, cho phép truy cập
            // (Dành cho Center Admin, Teacher, v.v.)
            if (isAuthenticated)
            {
                _logger.LogInformation($"[SystemApiKey] Request is authenticated, allowing");
                await _next(context);
                return;
            }

            // Nếu chưa authenticate, kiểm tra API key
            // Chỉ yêu cầu API key cho System Admin (không có JWT)
            if (!context.Request.Headers.TryGetValue(HEADER_NAME, out var apiKeyFromRequest))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsync("API Key is missing");
                return;
            }

            // Lấy API key từ appsettings
            var systemApiKey = configuration["SystemApiKey"];

            // Kiểm tra API key bằng constant-time comparison để tránh timing attack
            if (string.IsNullOrEmpty(systemApiKey) || !ConstantTimeEquals(apiKeyFromRequest.ToString(), systemApiKey))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsync("Invalid API Key");
                return;
            }

            var systemApiUserId = configuration["SystemApiUserId"];
            if (!int.TryParse(systemApiUserId, out var parsedSystemApiUserId))
            {
                parsedSystemApiUserId = 0;
            }

            var claims = new[]
            {
                new Claim(ClaimTypes.Name, "SystemAdmin"),
                new Claim(ClaimTypes.Role, "SystemAdmin"),
                new Claim(ClaimTypes.NameIdentifier, parsedSystemApiUserId.ToString())
            };
            var identity = new ClaimsIdentity(claims, "SystemApiKey");
            context.User = new ClaimsPrincipal(identity);

            await _next(context);
        }

        private static bool ConstantTimeEquals(string a, string b)
        {
            var aBytes = Encoding.UTF8.GetBytes(a);
            var bBytes = Encoding.UTF8.GetBytes(b);
            return CryptographicOperations.FixedTimeEquals(aBytes, bBytes);
        }
    }
}
