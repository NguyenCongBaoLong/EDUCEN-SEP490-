using Microsoft.AspNetCore.Http;

namespace EducenAPI.Middleware
{
    public class SystemApiKeyMiddleware
    {
        private readonly RequestDelegate _next;
        private const string HEADER_NAME = "X-API-KEY";

        public SystemApiKeyMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, IConfiguration configuration)
        {
            // Chỉ áp dụng cho System API
            if (!context.Request.Path.StartsWithSegments("/api/tenants"))
            {
                await _next(context);
                return;
            }

            // Lấy API key từ header
            if (!context.Request.Headers.TryGetValue(HEADER_NAME, out var apiKeyFromRequest))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsync("API Key is missing");
                return;
            }

            // Lấy API key từ appsettings
            var systemApiKey = configuration["SystemApiKey"];

            // Kiểm tra API key
            if (string.IsNullOrEmpty(systemApiKey) || apiKeyFromRequest != systemApiKey)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsync("Invalid API Key");
                return;
            }

            await _next(context);
        }
    }
}