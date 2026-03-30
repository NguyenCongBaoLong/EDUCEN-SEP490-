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

        private static async Task SeedDemoTenantPaymentConfigsAsync(AdminDbContext adminDbContext)
        {
            var sampleTenants = await adminDbContext.Tenants
                .OrderBy(t => t.TenantName)
                .ThenBy(t => t.TenantId)
                .Take(2)
                .ToListAsync();

            if (sampleTenants.Count == 0)
            {
                return;
            }

            var utcNow = DateTime.UtcNow;

            for (var i = 0; i < sampleTenants.Count; i++)
            {
                var tenant = sampleTenants[i];
                var demoConfigData =
                    "{\"tmnCode\":\"2ZW2C82M\",\"hashSecret\":\"KX7R3MJ5KV9Z7IFQ42867ENPP99W2OT1\",\"baseUrl\":\"https://sandbox.vnpayment.vn/paymentv2/vpcpay.html\",\"apiUrl\":\"https://sandbox.vnpayment.vn/merchant_webapi/api/transaction\",\"returnUrl\":\"http://localhost:5173/payment/result\",\"frontendReturnUrl\":\"http://localhost:5173/payment/result\",\"ipnUrl\":\"https://d450-183-80-74-205.ngrok-free.app/api/payments/vnpay/callback\",\"note\":\"Sandbox config - returnUrl goes direct to FE, ipnUrl uses ngrok for server callback\"}";

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
                        DisplayName = $"Demo VNPay Config #{i + 1}",
                        ConfigData = demoConfigData,
                        Status = "Active",
                        SubmittedAt = utcNow,
                        ApprovedAt = utcNow,
                        ActivatedAt = utcNow,
                        CreatedAt = utcNow,
                        CreatedBy = "system-admin-demo-seed",
                        UpdatedAt = utcNow,
                        UpdatedBy = "system-admin-demo-seed",
                        IsDeleted = false,
                        DeletedAt = null,
                        DeletedBy = null
                    };

                    adminDbContext.TenantPaymentGatewayConfigs.Add(config);
                }
                else
                {
                    config.DisplayName = $"Demo VNPay Config #{i + 1}";
                    config.ConfigData = demoConfigData;
                    config.Status = "Active";
                    config.SubmittedAt ??= utcNow;
                    config.ApprovedAt ??= utcNow;
                    config.ActivatedAt ??= utcNow;
                    config.DeactivatedAt = null;
                    config.StatusReason = "Demo seed reset";
                    config.UpdatedAt = utcNow;
                    config.UpdatedBy = "system-admin-demo-seed";
                    config.IsDeleted = false;
                    config.DeletedAt = null;
                    config.DeletedBy = null;
                }
            }

            await adminDbContext.SaveChangesAsync();
        }
    }
}
