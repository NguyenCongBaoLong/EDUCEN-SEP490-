using EducenAPI.DTOs.AdminDashboard;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Collections.Concurrent;

namespace EducenAPI.Services
{
    public class AdminDashboardService : IAdminDashboardService
    {
        private readonly AdminDbContext _adminDbContext;
        private readonly IServiceProvider _serviceProvider;
        private readonly IMemoryCache _cache;
        private static readonly SemaphoreSlim _semaphore = new SemaphoreSlim(10, 10);

        public AdminDashboardService(
            AdminDbContext adminDbContext,
            IServiceProvider serviceProvider,
            IMemoryCache cache)
        {
            _adminDbContext = adminDbContext;
            _serviceProvider = serviceProvider;
            _cache = cache;
        }

        public async Task<AdminDashboardResponse> GetDashboardAsync()
        {
            if (_cache.TryGetValue("admin_dashboard", out AdminDashboardResponse cached))
                return cached;

            var tenants = await _adminDbContext.Tenants
                .Select(t => new
                {
                    t.TenantId,
                    t.TenantName,
                    t.SubDomain,
                    t.ConnectionString
                })
                .ToListAsync();

            int totalUsers = 0;
            int totalStudents = 0;
            int totalClasses = 0;

            var topCentersBag = new ConcurrentBag<TopCenterResponse>();

            var tenantTasks = tenants.Select(async tenant =>
            {
                if (string.IsNullOrEmpty(tenant.ConnectionString))
                    return;

                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<EducenV2Context>();

                    db.Database.SetConnectionString(tenant.ConnectionString);
                    db.Database.SetCommandTimeout(3); // 3 seconds timeout for metrics

                    await _semaphore.WaitAsync();
                    try
                    {
                        var userCount = await db.Users.CountAsync();
                        var studentCount = await db.Students.CountAsync();
                        var classCount = await db.Classes.CountAsync();

                        Interlocked.Add(ref totalUsers, userCount);
                        Interlocked.Add(ref totalStudents, studentCount);
                        Interlocked.Add(ref totalClasses, classCount);

                        topCentersBag.Add(new TopCenterResponse
                        {
                            TenantName = tenant.TenantName,
                            TotalStudents = studentCount,
                            TotalClasses = classCount
                        });
                    }
                    finally
                    {
                        _semaphore.Release();
                    }
                }
                catch
                {
                    topCentersBag.Add(new TopCenterResponse
                    {
                        TenantName = tenant.TenantName,
                        TotalStudents = 0,
                        TotalClasses = 0
                    });
                }
            });

            await Task.WhenAll(tenantTasks);

            var now = DateTime.UtcNow;

            var activeTenantIds = await _adminDbContext.Subscriptions
                .Where(s => s.Status == "Active" && s.EndDate > now)
                .Select(s => s.TenantId)
                .Distinct()
                .ToListAsync();

            var overview = new DashboardOverviewResponse
            {
                TotalTenants = tenants.Count,
                ActiveTenants = activeTenantIds.Count,
                ExpiredTenants = tenants.Count - activeTenantIds.Count,
                TotalUsers = totalUsers,
                TotalStudents = totalStudents,
                TotalClasses = totalClasses,
                TotalStorageMB = 0
            };

            var totalRevenue = await _adminDbContext.PaymentRecords.SumAsync(x => x.Amount);

            var thisMonthRevenue = await _adminDbContext.PaymentRecords
                .Where(x => x.PaymentDate.Month == now.Month && x.PaymentDate.Year == now.Year)
                .SumAsync(x => x.Amount);

            var revenueRaw = await _adminDbContext.PaymentRecords
    .GroupBy(p => new { p.PaymentDate.Year, p.PaymentDate.Month })
    .Select(g => new
    {
        g.Key.Year,
        g.Key.Month,
        Revenue = g.Sum(x => x.Amount)
    })
    .ToListAsync();

            var revenueByMonth = revenueRaw
                .Select(x => new RevenueByMonth
                {
                    Month = $"{x.Month}/{x.Year}",
                    Revenue = x.Revenue
                })
                .OrderBy(x => x.Month)
                .ToList();

            var revenue = new RevenueReportResponse
            {
                TotalRevenue = totalRevenue,
                ThisMonthRevenue = thisMonthRevenue,
                RevenueByMonth = revenueByMonth
            };

            var tenantsByPlan = await _adminDbContext.Subscriptions
                .Where(s => s.Status == "Active" && s.EndDate > now)
                .Select(s => new { s.TenantId, s.Plan.PlanName })
                .GroupBy(s => s.PlanName)
                .Select(g => new TenantsByPlanResponse
                {
                    PlanName = g.Key,
                    TotalTenants = g.Select(x => x.TenantId).Distinct().Count()
                })
                .ToListAsync();

            var expiring = await _adminDbContext.Subscriptions
                .Where(s => s.Status == "Active" && s.EndDate <= now.AddDays(7))
                .Select(s => new ExpiringSubscriptionResponse
                {
                    TenantName = s.Tenant.TenantName,
                    SubDomain = s.Tenant.SubDomain,
                    PlanName = s.Plan.PlanName,
                    ExpiredAt = s.EndDate
                })
                .OrderBy(x => x.ExpiredAt)
                .ToListAsync();

            var topCenters = topCentersBag
                .OrderByDescending(x => x.TotalStudents)
                .Take(5)
                .ToList();

            var result = new AdminDashboardResponse
            {
                Overview = overview,
                Revenue = revenue,
                TopCenters = topCenters,
                TenantsByPlan = tenantsByPlan,
                ExpiringSubscriptions = expiring
            };

            _cache.Set("admin_dashboard", result, TimeSpan.FromMinutes(2));

            return result;
        }
    }
}