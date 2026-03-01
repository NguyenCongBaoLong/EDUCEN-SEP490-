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
            context.Request.Headers.TryGetValue("tenant", out var tenantFromHeader); // Tenant Id from incoming request header
            if (string.IsNullOrEmpty(tenantFromHeader) == false)
            {
                await currentTenantService.SetTenant(tenantFromHeader);
            }

            await _next(context);
        }
    }
}