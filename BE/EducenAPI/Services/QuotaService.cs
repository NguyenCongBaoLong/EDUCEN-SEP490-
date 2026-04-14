using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
using EducenAPI.Services.Interface;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class QuotaService : IQuotaService
    {
        private readonly AdminDbContext _adminDbContext;
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;

        public QuotaService(
            AdminDbContext adminDbContext,
            IServiceProvider serviceProvider,
            IConfiguration configuration)
        {
            _adminDbContext = adminDbContext;
            _serviceProvider = serviceProvider;
            _configuration = configuration;
        }

        private async Task<(Subscription? Subscription, Plan? Plan)> GetActiveSubscriptionAndPlanAsync(string tenantId)
        {
            var subscription = await _adminDbContext.Subscriptions
                .Include(s => s.Plan)
                .Where(s => s.TenantId == tenantId && s.Status == "Active" && s.EndDate > DateTime.UtcNow)
                .OrderByDescending(s => s.EndDate)
                .FirstOrDefaultAsync();

            return (subscription, subscription?.Plan);
        }

        private async Task<int> GetActiveUserCountAsync(string tenantId)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<EducenV2Context>();

            var baseConnStr = _configuration.GetConnectionString("DefaultTenantConnection");
            var baseBuilder = new SqlConnectionStringBuilder(baseConnStr);
            var tenantBuilder = new SqlConnectionStringBuilder(GetTenantConnectionString(tenantId));
            baseBuilder.InitialCatalog = tenantBuilder.InitialCatalog;
            dbContext.Database.SetConnectionString(baseBuilder.ConnectionString);

            return await dbContext.Users
                .Where(u => u.AccountStatus == "Active" && !string.IsNullOrEmpty(u.Username))
                .CountAsync();
        }

        private string GetTenantConnectionString(string tenantId)
        {
            var tenant = _adminDbContext.Tenants.FirstOrDefault(t => t.TenantId == tenantId);
            return tenant?.ConnectionString ?? "";
        }

        private async Task<long> GetStorageUsedBytesAsync(string tenantId)
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<EducenV2Context>();

            var baseConnStr = _configuration.GetConnectionString("DefaultTenantConnection");
            var baseBuilder = new SqlConnectionStringBuilder(baseConnStr);
            var tenantBuilder = new SqlConnectionStringBuilder(GetTenantConnectionString(tenantId));
            baseBuilder.InitialCatalog = tenantBuilder.InitialCatalog;
            dbContext.Database.SetConnectionString(baseBuilder.ConnectionString);

            var resourceFiles = await dbContext.ResourceFiles.ToListAsync();
            long totalBytes = 0;

            var basePath = Path.Combine(AppContext.BaseDirectory, "wwwroot");
            foreach (var rf in resourceFiles)
            {
                if (!string.IsNullOrEmpty(rf.FilePath))
                {
                    var normalizedPath = rf.FilePath.Replace("/", Path.DirectorySeparatorChar.ToString())
                                            .Replace("\\", Path.DirectorySeparatorChar.ToString());
                    if (!normalizedPath.StartsWith("wwwroot" + Path.DirectorySeparatorChar))
                        normalizedPath = Path.Combine("wwwroot", normalizedPath);

                    if (File.Exists(normalizedPath))
                    {
                        totalBytes += new FileInfo(normalizedPath).Length;
                    }
                }
            }

            return totalBytes;
        }

        public async Task<(int LimitUsers, int UsedUsers, int StorageLimitMB, int UsedStorageMB)> GetQuotaUsageAsync()
        {
            var tenantId = GetCurrentTenantId();
            if (string.IsNullOrEmpty(tenantId))
                return (0, 0, 0, 0);

            var (_, plan) = await GetActiveSubscriptionAndPlanAsync(tenantId);
            var limitUsers = plan?.LimitUsers ?? 0;
            var storageLimitMB = plan?.StorageLimit ?? 0;

            var usedUsers = await GetActiveUserCountAsync(tenantId);
            var usedStorageBytes = await GetStorageUsedBytesAsync(tenantId);
            var usedStorageMB = (int)(usedStorageBytes / (1024 * 1024));

            return (limitUsers, usedUsers, storageLimitMB, usedStorageMB);
        }

        public async Task<(bool CanAddUser, string? ErrorMessage)> CheckCanAddUserAsync()
        {
            var tenantId = GetCurrentTenantId();
            if (string.IsNullOrEmpty(tenantId))
                return (true, null);

            var (_, plan) = await GetActiveSubscriptionAndPlanAsync(tenantId);
            if (plan == null)
                return (true, null);

            var limitUsers = plan.LimitUsers;
            if (limitUsers <= 0)
                return (true, null);

            var usedUsers = await GetActiveUserCountAsync(tenantId);

            if (usedUsers >= limitUsers)
            {
                return (false, $"Đã đạt giới hạn người dùng hoạt động ({usedUsers}/{limitUsers}). Vui lòng nâng cấp gói dịch vụ để thêm người dùng.");
            }

            return (true, null);
        }

        public async Task<(bool CanUpload, long FileSizeBytes, string? ErrorMessage)> CheckCanUploadAsync(long fileSizeBytes)
        {
            var tenantId = GetCurrentTenantId();
            if (string.IsNullOrEmpty(tenantId))
                return (true, fileSizeBytes, null);

            var (_, plan) = await GetActiveSubscriptionAndPlanAsync(tenantId);
            if (plan == null)
                return (true, fileSizeBytes, null);

            var storageLimitMB = plan.StorageLimit;
            if (storageLimitMB <= 0)
                return (true, fileSizeBytes, null);

            var usedStorageBytes = await GetStorageUsedBytesAsync(tenantId);
            var usedStorageMB = usedStorageBytes / (1024 * 1024);
            var fileSizeMB = fileSizeBytes / (1024 * 1024);
            var availableStorageMB = storageLimitMB - usedStorageMB;

            if (fileSizeMB > availableStorageMB)
            {
                return (false, fileSizeBytes, $"Không đủ dung lượng lưu trữ. Còn {availableStorageMB}MB khả dụng, file cần {fileSizeMB}MB. Vui lòng nâng cấp gói dịch vụ hoặc xóa tài liệu cũ.");
            }

            return (true, fileSizeBytes, null);
        }

        private string GetCurrentTenantId()
        {
            using var scope = _serviceProvider.CreateScope();
            var currentTenantService = scope.ServiceProvider.GetRequiredService<ICurrentTenantService>();
            return currentTenantService.TenantId;
        }
    }
}