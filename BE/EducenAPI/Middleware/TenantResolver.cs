using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace EducenAPI.Middleware
{
    public class TenantResolver
    {
        private readonly RequestDelegate _next;
        private readonly IMemoryCache _cache;

        public TenantResolver(RequestDelegate next, IMemoryCache cache)
        {
            _next = next;
            _cache = cache;
        }

        public async Task InvokeAsync(
            HttpContext context,
            ICurrentTenantService currentTenantService,
            AdminDbContext adminDbContext)
        {
            string subDomain = string.Empty;

            // 1. Lấy Subdomain từ URL Host (ví dụ: center1.educen.com -> center1)
            var host = context.Request.Host.Host;
            if (!string.IsNullOrEmpty(host))
            {
                var parts = host.Split('.');

                // Kiểm tra nếu có subdomain và không phải các tiền tố mặc định
                if (parts.Length >= 2 && parts[0] != "www" && parts[0] != "localhost")
                {
                    subDomain = parts[0];
                }
            }

            // 2. Dự phòng: Nếu không lấy được từ host, kiểm tra trong Header "tenant"
            if (string.IsNullOrEmpty(subDomain))
            {
                if (context.Request.Headers.TryGetValue("tenant", out var tenantHeader))
                {
                    subDomain = tenantHeader.FirstOrDefault();
                }
            }

            // 3. Nếu không lấy được từ header, thử query parameter (?tenant=xxx)
            if (string.IsNullOrEmpty(subDomain))
            {
                var tenantFromQuery = context.Request.Query["tenant"].FirstOrDefault();
                if (!string.IsNullOrEmpty(tenantFromQuery))
                {
                    subDomain = tenantFromQuery;
                }
            }

            // 4. Set tenant only if we have a valid tenantId
            if (!string.IsNullOrEmpty(subDomain))
            {
                string cacheKey = $"tenant_id_map_{subDomain}";

                // Kiểm tra trong Cache trước để tránh truy vấn Database liên tục
                if (!_cache.TryGetValue(cacheKey, out string actualTenantId))
                {
                    // Truy vấn AdminDbContext để tìm TenantId dựa trên SubDomain
                    var tenant = await adminDbContext.Tenants
                        .AsNoTracking()
                        .Where(t => t.SubDomain == subDomain && t.IsActive)
                        .Select(t => t.TenantId)
                        .FirstOrDefaultAsync();

                    if (tenant != null)
                    {
                        actualTenantId = tenant;
                        // Lưu vào cache trong 30 phút
                        _cache.Set(cacheKey, actualTenantId, TimeSpan.FromMinutes(30));
                    }
                }

                // 4. Thiết lập TenantId cho phiên làm việc hiện tại
                if (!string.IsNullOrEmpty(actualTenantId))
                {
                    try
                    {
                        await currentTenantService.SetTenant(actualTenantId);
                    }
                    catch (Exception ex)
                    {
                        // Ghi log lỗi nếu cần thiết
                        Console.WriteLine($"TenantResolver: Không thể thiết lập TenantId '{actualTenantId}': {ex.Message}");
                    }
                }
            }

            await _next(context);
        }
    }
}