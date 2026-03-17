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
            string tenantId = null;

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
                context.Request.Headers.TryGetValue("tenant", out var tenantFromHeader);

                if (!string.IsNullOrEmpty(tenantFromHeader))
                {
                    tenantId = tenantFromHeader.ToString();
                }
            }

            // 3. Set tenant
            if (!string.IsNullOrEmpty(tenantId))
            {
                await currentTenantService.SetTenant(tenantId);
            }

            await _next(context);
        }
    }
}