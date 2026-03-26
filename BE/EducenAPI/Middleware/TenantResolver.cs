using EducenAPI.Services;

namespace EducenAPI.Middleware
{
    public class TenantResolver
    {
        private readonly RequestDelegate _next;

        public TenantResolver(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(
            HttpContext context,
            ICurrentTenantService currentTenantService)
        {
            string tenantId = string.Empty;

            // 1. Lấy host từ request
            var host = context.Request.Host.Host;

            if (!string.IsNullOrEmpty(host))
            {
                var parts = host.Split('.');

                // Nếu có subdomain (ví dụ center1.educen.com)
                if (parts.Length > 2 && parts[0] != "www")
                {
                    tenantId = parts[0];
                }
            }

            // 2. Nếu không lấy được từ host (local dev) thì fallback sang header
            if (string.IsNullOrEmpty(tenantId))
            {
                // Try both "tenant" and "Tenant" headers (case-insensitive)
                if (context.Request.Headers.TryGetValue("tenant", out var tenantFromHeader))
                {
                    var headerValue = tenantFromHeader.FirstOrDefault();
                    if (!string.IsNullOrEmpty(headerValue))
                    {
                        tenantId = headerValue;
                    }
                }
                
                // Try "Tenant" header if "tenant" didn't work
                if (string.IsNullOrEmpty(tenantId) && context.Request.Headers.TryGetValue("Tenant", out var tenantFromHeader2))
                {
                    var headerValue2 = tenantFromHeader2.FirstOrDefault();
                    if (!string.IsNullOrEmpty(headerValue2))
                    {
                        tenantId = headerValue2;
                    }
                }
            }

            // 3. Set tenant only if we have a valid tenantId
            if (!string.IsNullOrEmpty(tenantId))
            {
                try
                {
                    await currentTenantService.SetTenant(tenantId);
                }
                catch (Exception ex)
                {
                    // Log but continue - will use default connection
                    Console.WriteLine($"TenantResolver: Failed to set tenant '{tenantId}': {ex.Message}");
                }
            }

            await _next(context);
        }
    }
}