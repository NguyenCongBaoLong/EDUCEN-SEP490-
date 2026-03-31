using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
using EducenAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Persistence.Extensions
{
    public static class DatabaseInitializationExtensions
    {
        public static async Task InitializeDatabasesAsync(
            this IServiceProvider serviceProvider,
            IConfiguration configuration)
        {
            using var scope = serviceProvider.CreateScope();
            var services = scope.ServiceProvider;

            // =============================
            // 1️⃣ Migrate Admin Database
            // =============================
            var adminDbContext =
                services.GetRequiredService<AdminDbContext>();

            if ((await adminDbContext.Database.GetPendingMigrationsAsync()).Any())
            {
                Console.ForegroundColor = ConsoleColor.Blue;
                Console.WriteLine("Applying AdminDb migrations...");
                Console.ResetColor();

                await adminDbContext.Database.MigrateAsync();
            }

            await SeedDemoTenantPaymentConfigsAsync(adminDbContext);

            // =============================
            // 2️⃣ Get Tenants from Admin DB
            // =============================
            var tenants = await adminDbContext.Tenants.ToListAsync();

            var defaultConnectionString =
                configuration.GetConnectionString("DefaultConnection");

            // =============================
            // 3️⃣ Migrate each Tenant DB
            // =============================
            foreach (var tenant in tenants)
            {
                var connectionString =
                    string.IsNullOrWhiteSpace(tenant.ConnectionString)
                        ? defaultConnectionString
                        : tenant.ConnectionString;

                var optionsBuilder =
                    new DbContextOptionsBuilder<EducenV2Context>();

                optionsBuilder.UseSqlServer(connectionString);

                var fakeTenantService =
                    new MigrationTenantService(tenant.TenantId, connectionString);

                using var tenantDbContext =
                    new EducenV2Context(optionsBuilder.Options, fakeTenantService);

                if ((await tenantDbContext.Database.GetPendingMigrationsAsync()).Any())
                {
                    Console.ForegroundColor = ConsoleColor.Blue;
                    Console.WriteLine($"Applying migrations for tenant '{tenant.TenantId}'...");
                    Console.ResetColor();

                    await tenantDbContext.Database.MigrateAsync();
                }
            }
        }

        /// <summary>
        /// Seed per-tenant VNPay sandbox configs.
        /// - CenterEducenV2 → dùng sandbox riêng (TmnCode: 4WXCBEXO)
        /// - Các tenant khác → dùng sandbox chung (TmnCode: 2ZW2C82M)
        /// - SystemAdmin → dùng global config trong appsettings.json (không cần DB record)
        /// </summary>
        private static async Task SeedDemoTenantPaymentConfigsAsync(AdminDbContext adminDbContext)
        {
            var allTenants = await adminDbContext.Tenants
                .OrderBy(t => t.TenantName)
                .ThenBy(t => t.TenantId)
                .ToListAsync();

            if (allTenants.Count == 0)
            {
                return;
            }

            var utcNow = DateTime.UtcNow;

            // Sandbox config cho CenterEducenV2 (tài khoản VNPay riêng)
            var educenV2ConfigData =
                "{\"tmnCode\":\"4WXCBEXO\",\"hashSecret\":\"7DH257JS7RITTUJTCAIDBEFSPORWNE66\",\"baseUrl\":\"https://sandbox.vnpayment.vn/paymentv2/vpcpay.html\",\"apiUrl\":\"https://sandbox.vnpayment.vn/merchant_webapi/api/transaction\",\"returnUrl\":\"http://localhost:5173/payment/result\",\"frontendReturnUrl\":\"http://localhost:5173/payment/result\",\"ipnUrl\":\"https://d450-183-80-74-205.ngrok-free.app/api/payments/vnpay/callback\",\"note\":\"CenterEducenV2 sandbox config\"}";

            // Sandbox config mặc định cho các tenant khác (dùng chung tài khoản SystemAdmin)
            var defaultConfigData =
                "{\"tmnCode\":\"2ZW2C82M\",\"hashSecret\":\"KX7R3MJ5KV9Z7IFQ42867ENPP99W2OT1\",\"baseUrl\":\"https://sandbox.vnpayment.vn/paymentv2/vpcpay.html\",\"apiUrl\":\"https://sandbox.vnpayment.vn/merchant_webapi/api/transaction\",\"returnUrl\":\"http://localhost:5173/payment/result\",\"frontendReturnUrl\":\"http://localhost:5173/payment/result\",\"ipnUrl\":\"https://d450-183-80-74-205.ngrok-free.app/api/payments/vnpay/callback\",\"note\":\"Default sandbox config - shared with SystemAdmin\"}";

            foreach (var tenant in allTenants)
            {
                // Xác định config nào dùng cho tenant nào
                var isEducenV2 = tenant.TenantName.Contains("EducenV2", StringComparison.OrdinalIgnoreCase)
                              || tenant.TenantName.Contains("Educen V2", StringComparison.OrdinalIgnoreCase);

                var configData = isEducenV2 ? educenV2ConfigData : defaultConfigData;
                var displayName = isEducenV2
                    ? "CenterEducenV2 VNPay Sandbox"
                    : "Default VNPay Sandbox";

                var config = await adminDbContext.TenantPaymentGatewayConfigs
                    .FirstOrDefaultAsync(c =>
                        c.TenantId == tenant.TenantId &&
                        c.GatewayType == "VNPay" &&
                        !c.IsDeleted);

                if (config == null)
                {
                    config = new TenantPaymentGatewayConfig
                    {
                        ConfigId = Guid.NewGuid().ToString(),
                        TenantId = tenant.TenantId,
                        GatewayType = "VNPay",
                        DisplayName = displayName,
                        ConfigData = configData,
                        Status = "Active",
                        SubmittedAt = utcNow,
                        ApprovedAt = utcNow,
                        ActivatedAt = utcNow,
                        CreatedAt = utcNow,
                        CreatedBy = "system-admin-seed",
                        UpdatedAt = utcNow,
                        UpdatedBy = "system-admin-seed",
                        IsDeleted = false,
                        DeletedAt = null,
                        DeletedBy = null
                    };

                    adminDbContext.TenantPaymentGatewayConfigs.Add(config);
                }
                else
                {
                    config.DisplayName = displayName;
                    config.ConfigData = configData;
                    config.Status = "Active";
                    config.SubmittedAt ??= utcNow;
                    config.ApprovedAt ??= utcNow;
                    config.ActivatedAt ??= utcNow;
                    config.DeactivatedAt = null;
                    config.StatusReason = "Seed reset - per-tenant sandbox config";
                    config.UpdatedAt = utcNow;
                    config.UpdatedBy = "system-admin-seed";
                    config.IsDeleted = false;
                    config.DeletedAt = null;
                    config.DeletedBy = null;
                }
            }

            await adminDbContext.SaveChangesAsync();
        }
    }
}
