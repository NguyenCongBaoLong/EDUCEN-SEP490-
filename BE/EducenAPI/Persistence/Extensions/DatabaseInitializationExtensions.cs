using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
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
    }
}