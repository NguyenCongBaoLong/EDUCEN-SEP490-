using EducenAPI.DTOs.AdminDashboard;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class AdminDashboardService : IAdminDashboardService
    {
        private readonly AdminDbContext _adminDbContext;
        private readonly IServiceProvider _serviceProvider;

        public AdminDashboardService(
            AdminDbContext adminDbContext,
            IServiceProvider serviceProvider)
        {
            _adminDbContext = adminDbContext;
            _serviceProvider = serviceProvider;
        }

        private string PrepareConnectionString(string connectionString)
        {
            if (string.IsNullOrEmpty(connectionString)) return connectionString;

            // Tự động sửa server nếu là SQLEXPRESS nhưng môi trường hiện tại đang dùng Default Instance (localhost)
            if (connectionString.Contains("localhost\\SQLEXPRESS", StringComparison.OrdinalIgnoreCase))
            {
                // Thay thế localhost\SQLEXPRESS bằng localhost để khớp với AdminConnection
                connectionString = connectionString.Replace("localhost\\SQLEXPRESS", "localhost", StringComparison.OrdinalIgnoreCase);
            }

            if (!connectionString.Contains("Connect Timeout", StringComparison.OrdinalIgnoreCase))
            {
                connectionString += (connectionString.EndsWith(";") ? "" : ";") + "Connect Timeout=5;";
            }
            return connectionString;
        }

        // ================================
        // 1. OVERVIEW DASHBOARD
        // ================================
        public async Task<DashboardOverviewResponse> GetOverviewAsync()
        {
            var tenants = await _adminDbContext.Tenants.ToListAsync();

            int totalUsers = 0;
            int totalStudents = 0;
            int totalClasses = 0;
            double totalStorage = 0;

            var tasks = tenants.Select(async tenant =>
            {
                if (string.IsNullOrEmpty(tenant.ConnectionString)) return;

                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<EducenV2Context>();
                    db.Database.SetConnectionString(PrepareConnectionString(tenant.ConnectionString));

                    var uCount = await db.Users.CountAsync();
                    var sCount = await db.Students.CountAsync();
                    var cCount = await db.Classes.CountAsync();

                    Interlocked.Add(ref totalUsers, uCount);
                    Interlocked.Add(ref totalStudents, sCount);
                    Interlocked.Add(ref totalClasses, cCount);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DASHBOARD_ERROR] Tenant {tenant.TenantId} ({tenant.TenantName}): {ex.Message}");
                    if (ex.InnerException != null) Console.WriteLine($"  Inner: {ex.InnerException.Message}");
                }
            });

            await Task.WhenAll(tasks);

            var now = DateTime.UtcNow;
            var existingTenantIds = tenants.Select(t => t.TenantId).ToHashSet();
            var allSubscriptions = await _adminDbContext.Subscriptions.ToListAsync();
            var relevantSubs = allSubscriptions.Where(s => existingTenantIds.Contains(s.TenantId)).ToList();

            int activeCount = 0;
            foreach (var group in relevantSubs.GroupBy(s => s.TenantId))
            {
                var latest = group.OrderByDescending(s => s.EndDate).First();
                if (latest.EndDate > now && latest.Status == "Active")
                {
                    activeCount++;
                }
            }

            int expiredCount = tenants.Count - activeCount;

            return new DashboardOverviewResponse
            {
                TotalTenants = tenants.Count,
                ActiveTenants = activeCount,
                ExpiredTenants = expiredCount,
                TotalUsers = totalUsers,
                TotalStudents = totalStudents,
                TotalClasses = totalClasses,
                TotalStorageMB = totalStorage
            };
        }

        // ================================
        // 2. REVENUE REPORT
        // ================================
        public async Task<RevenueReportResponse> GetRevenueAsync()
        {
            var payments = await _adminDbContext.PaymentRecords.ToListAsync();

            var totalRevenue = payments.Sum(p => p.Amount);

            var thisMonthRevenue = payments
                .Where(p => p.PaymentDate.Month == DateTime.UtcNow.Month &&
                            p.PaymentDate.Year == DateTime.UtcNow.Year)
                .Sum(p => p.Amount);

            var revenueByMonth = payments
                .GroupBy(p => new { p.PaymentDate.Year, p.PaymentDate.Month })
                .Select(g => new RevenueByMonth
                {
                    Month = $"{g.Key.Month}/{g.Key.Year}",
                    Revenue = g.Sum(x => x.Amount)
                })
                .OrderBy(x => x.Month)
                .ToList();

            return new RevenueReportResponse
            {
                TotalRevenue = totalRevenue,
                ThisMonthRevenue = thisMonthRevenue,
                RevenueByMonth = revenueByMonth
            };
        }

        // ================================
        // 3. TENANTS BY PLAN
        // ================================
        public async Task<List<TenantsByPlanResponse>> GetTenantsByPlanAsync()
        {
            var tenants = await _adminDbContext.Tenants.Select(t => t.TenantId).ToListAsync();
            var existingTenantIds = tenants.ToHashSet();

            // Lấy các subscription đang Active và thuộc về tenant thực tế
            var activeSubscriptions = await _adminDbContext.Subscriptions
                .Include(s => s.Plan)
                .Where(s => s.Status == "Active" && s.EndDate > DateTime.UtcNow && existingTenantIds.Contains(s.TenantId))
                .ToListAsync();

            return activeSubscriptions
                .GroupBy(s => s.Plan.PlanName)
                .Select(g => new TenantsByPlanResponse
                {
                    PlanName = g.Key,
                    TotalTenants = g.Select(s => s.TenantId).Distinct().Count()
                })
                .ToList();
        }

        // ================================
        // 4. TOP CENTERS
        // ================================
        public async Task<List<TopCenterResponse>> GetTopCentersAsync()
        {
            var tenants = await _adminDbContext.Tenants.ToListAsync();

            var result = new System.Collections.Concurrent.ConcurrentBag<TopCenterResponse>();

            var tasks = tenants.Select(async tenant =>
            {
                if (string.IsNullOrEmpty(tenant.ConnectionString)) return;

                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<EducenV2Context>();
                    db.Database.SetConnectionString(PrepareConnectionString(tenant.ConnectionString));

                    var sCount = await db.Students.CountAsync();
                    var cCount = await db.Classes.CountAsync();

                    result.Add(new TopCenterResponse
                    {
                        TenantName = tenant.TenantName,
                        TotalStudents = sCount,
                        TotalClasses = cCount
                    });
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DASHBOARD_ERROR_TOP] Tenant {tenant.TenantId} ({tenant.TenantName}): {ex.Message}");
                    if (ex.InnerException != null) Console.WriteLine($"  Inner: {ex.InnerException.Message}");
                    
                    result.Add(new TopCenterResponse
                    {
                        TenantName = tenant.TenantName,
                        TotalStudents = 0,
                        TotalClasses = 0
                    });
                }
            });

            await Task.WhenAll(tasks);

            return result
                .OrderByDescending(x => x.TotalStudents)
                .Take(5)
                .ToList();
        }

        // ================================
        // 5. EXPIRING SUBSCRIPTIONS
        // ================================
        public async Task<List<ExpiringSubscriptionResponse>> GetExpiringSubscriptionsAsync()
        {
            var now = DateTime.UtcNow;
            var sevenDaysFromNow = now.AddDays(7);

            // 1. Lấy tất cả subscriptions ĐANG KÍCH HOẠT, group theo Tenant để tìm cái mới nhất
            var allSubscriptions = await _adminDbContext.Subscriptions
                .Include(s => s.Plan)
                .Include(s => s.Tenant)
                .Where(s => s.Status == "Active")
                .ToListAsync();

            var latestSubsPerTenant = allSubscriptions
                .GroupBy(s => s.TenantId)
                .Select(g => g.OrderByDescending(s => s.EndDate).First())
                .ToList();

            // 2. Chỉ hiển thị nếu cái MỚI NHẤT đó sắp hết hạn (trong vòng 7 ngày) hoặc đã hết hạn (nhưng vẫn còn Status Active)
            return latestSubsPerTenant
                .Where(s => s.EndDate <= sevenDaysFromNow)
                .Select(s => new ExpiringSubscriptionResponse
                {
                    TenantName = s.Tenant.TenantName,
                    SubDomain = s.Tenant.SubDomain,
                    PlanName = s.Plan.PlanName,
                    ExpiredAt = s.EndDate
                })
                .OrderBy(s => s.ExpiredAt)
                .ToList();
        }
    }
}