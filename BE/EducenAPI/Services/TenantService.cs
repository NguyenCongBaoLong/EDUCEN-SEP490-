using EducenAPI.DTOs;
using EducenAPI.DTOs.Tenant;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services.TenantService
{
    public class TenantService : ITenantService
    {

        private readonly AdminDbContext _adminDbContext; // database context
        private readonly IConfiguration _configuration;
        private readonly IServiceProvider _serviceProvider;

        public TenantService(AdminDbContext adminDbContext, IConfiguration configuration, IServiceProvider serviceProvider)
        {
            _adminDbContext = adminDbContext;
            _configuration = configuration;
            _serviceProvider = serviceProvider;
        }

        public Tenant CreateTenant(CreateTenantRequest request)
        {

            string connectionString = _configuration.GetConnectionString("DefaultTenantConnection");
            SqlConnectionStringBuilder builder = new(connectionString);
            string mainDatabaseName = builder.InitialCatalog; // retrieve the database name
            string tenantDbName = mainDatabaseName + "-" + request.TenantId;
            builder.InitialCatalog = tenantDbName; // set new database name
            string modifiedConnectionString = builder.ConnectionString; // create new connection string

            Tenant tenant = new Tenant
            {
                TenantId = request.TenantId,
                TenantName = request.TenantName,
                ContactPerson = request.ContactPerson,
                Email = request.Email,
                PhoneNumber = request.PhoneNumber,
                Address = request.Address,
                SubDomain = request.SubDomain,
                ConnectionString = modifiedConnectionString,
                IsActive = true,
                Username = request.TenantId,   // mặc định = TenantId, admin có thể đổi sau
                Password = "Admin@123"          // mật khẩu mặc định ban đầu
            };



            try
            {
                // create a new tenant database and bring current with any pending migrations from ApplicationDbContext
                using IServiceScope scopeTenant = _serviceProvider.CreateScope();
                EducenV2Context dbContext = scopeTenant.ServiceProvider.GetRequiredService<EducenV2Context>();
                dbContext.Database.SetConnectionString(modifiedConnectionString);
                if (dbContext.Database.GetPendingMigrations().Any())
                {
                    Console.ForegroundColor = ConsoleColor.Blue;
                    Console.WriteLine($"Applying ApplicationDB Migrations for New '{request.TenantId}' tenant.");
                    Console.ResetColor();
                    dbContext.Database.Migrate();

                }

                // apply changes to base db context
                _adminDbContext.Add(tenant); // save tenant info
                _adminDbContext.SaveChanges();
            }
            catch (Exception ex)
            {
                throw new Exception(ex.Message);
            }

            return tenant;
        }

        public IEnumerable<Tenant> GetAllTenants()
        {
            return _adminDbContext.Tenants.ToList();
        }

        public Tenant? GetTenantById(string tenantId)
        {
            return _adminDbContext.Tenants
                .FirstOrDefault(t => t.TenantId == tenantId);
        }

        public Tenant? UpdateTenant(string tenantId, UpdateTenantRequest request)
        {
            var tenant = _adminDbContext.Tenants
                .FirstOrDefault(t => t.TenantId == tenantId);

            if (tenant == null)
                return null;

            tenant.TenantName = request.TenantName;
            tenant.ContactPerson = request.ContactPerson;
            tenant.Email = request.Email;
            tenant.PhoneNumber = request.PhoneNumber;
            tenant.Address = request.Address;
            tenant.SubDomain = request.SubDomain;
            tenant.IsActive = request.IsActive;

            _adminDbContext.SaveChanges();

            return tenant;
        }

        public IEnumerable<TenantWithSubscriptionRequest> GetAllTenantDetails()
        {
            var tenants = _adminDbContext.Tenants.ToList();

            var result = new List<TenantWithSubscriptionRequest>();

            foreach (var tenant in tenants)
            {
                var subscription = _adminDbContext.Subscriptions
                    .Include(s => s.Plan)
                    .Where(s => s.TenantId == tenant.TenantId)
                    .OrderByDescending(s => s.StartDate)
                    .FirstOrDefault();

                var usage = GetTenantUsage(tenant);

                result.Add(new TenantWithSubscriptionRequest
                {
                    TenantName = tenant.TenantName,

                    PlanName = subscription?.Plan?.PlanName,
                    IsSubscribed = subscription != null && subscription.EndDate > DateTime.UtcNow,
                    ExpiredAt = subscription?.EndDate,

                    TotalUsers = usage.TotalUsers,
                    TotalStudents = usage.TotalStudents,
                    TotalClasses = usage.TotalClasses,
                    StorageMB = usage.StorageMB
                });
            }

            return result;
        }

        public TenantWithSubscriptionRequest? GetTenantDetails(string tenantId)
        {
            var tenant = _adminDbContext.Tenants
                .FirstOrDefault(t => t.TenantId == tenantId);

            if (tenant == null)
                return null;

            var subscription = _adminDbContext.Subscriptions
                .Include(s => s.Plan)
                .Where(s => s.TenantId == tenantId)
                .OrderByDescending(s => s.StartDate)
                .FirstOrDefault();

            var usage = GetTenantUsage(tenant);

            return new TenantWithSubscriptionRequest
            {
                TenantName = tenant.TenantName,

                PlanName = subscription?.Plan?.PlanName,
                IsSubscribed = subscription != null && subscription.EndDate > DateTime.UtcNow,
                ExpiredAt = subscription?.EndDate,

                TotalUsers = usage.TotalUsers,
                TotalStudents = usage.TotalStudents,
                TotalClasses = usage.TotalClasses,
                StorageMB = usage.StorageMB
            };
        }
        private (int TotalUsers, int TotalStudents, int TotalClasses, double StorageMB) GetTenantUsage(Tenant tenant)
        {
            using IServiceScope scope = _serviceProvider.CreateScope();

            var db = scope.ServiceProvider.GetRequiredService<EducenV2Context>();

            db.Database.SetConnectionString(tenant.ConnectionString);

            int users = db.Users.Count();
            int students = db.Students.Count();
            int classes = db.Classes.Count();

            double storage = 0; // có thể tính từ file hoặc blob sau

            return (users, students, classes, storage);
        }
    }
}