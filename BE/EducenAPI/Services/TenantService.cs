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
            request.TenantName = request.TenantName?.Trim();
            request.ContactPerson = request.ContactPerson?.Trim();
            request.Email = request.Email?.Trim();
            request.PhoneNumber = request.PhoneNumber?.Trim();
            request.Address = request.Address?.Trim();
            request.SubDomain = request.SubDomain?.Trim().ToLower();

            // 1. Check SubDomain chứa space
            if (request.SubDomain.Contains(" "))
                throw new Exception("SubDomain cannot contain spaces");

            // 2. Check ký tự hợp lệ
            var regex = new System.Text.RegularExpressions.Regex("^[a-z0-9-]+$");
            if (!regex.IsMatch(request.SubDomain))
                throw new Exception("SubDomain can only contain lowercase letters, numbers, and '-'");

            // 3. Check duplicate SubDomain
            if (_adminDbContext.Tenants.Any(t => t.SubDomain == request.SubDomain))
                throw new Exception("SubDomain already exists");

            // 4. Check duplicate TenantName
            if (_adminDbContext.Tenants.Any(t => t.TenantName == request.TenantName))
                throw new Exception("Tenant name already exists");

            // create tenant (TenantId auto GUID)
            Tenant tenant = new Tenant
            {
                TenantName = request.TenantName,
                ContactPerson = request.ContactPerson,
                Email = request.Email,
                PhoneNumber = request.PhoneNumber,
                Address = request.Address,
                SubDomain = request.SubDomain,
                Username = "admin",
                Password = "Admin@123",
                IsActive = true
            };

            string connectionString = _configuration.GetConnectionString("DefaultTenantConnection");

            SqlConnectionStringBuilder builder = new(connectionString);

            string mainDatabaseName = builder.InitialCatalog;

            string tenantDbName = $"{mainDatabaseName}-{tenant.TenantId}";

            builder.InitialCatalog = tenantDbName;

            string modifiedConnectionString = builder.ConnectionString;

            tenant.ConnectionString = modifiedConnectionString;

            try
            {
                using IServiceScope scopeTenant = _serviceProvider.CreateScope();

                EducenV2Context dbContext = scopeTenant.ServiceProvider.GetRequiredService<EducenV2Context>();

                dbContext.Database.SetConnectionString(modifiedConnectionString);

                if (dbContext.Database.GetPendingMigrations().Any())
                {
                    Console.ForegroundColor = ConsoleColor.Blue;
                    Console.WriteLine($"Applying ApplicationDB Migrations for New '{tenant.TenantId}' tenant.");
                    Console.ResetColor();

                    dbContext.Database.Migrate();
                }

                _adminDbContext.Add(tenant);
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
                    .Where(s => s.TenantId == tenant.TenantId && s.Status == "Active")
                    .OrderByDescending(s => s.StartDate)
                    .FirstOrDefault();

                var usage = GetTenantUsage(tenant);

                result.Add(new TenantWithSubscriptionRequest
                {
                    TenantId = tenant.TenantId,
                    TenantName = tenant.TenantName,
                    SubDomain = tenant.SubDomain,
                    IsActive = tenant.IsActive,

                    ContactPerson = tenant.ContactPerson,
                    Email = tenant.Email,
                    PhoneNumber = tenant.PhoneNumber,
                    Address = tenant.Address,

                    PlanId = subscription?.PlanId,
                    PlanName = subscription?.Plan?.PlanName,
                    IsSubscribed = subscription != null && subscription.Status == "Active" && subscription.EndDate > DateTime.UtcNow,
                    ExpiredAt = subscription?.EndDate,
                    PlanIsActive = subscription?.Plan?.IsActive ?? true,

                    LimitUsers = subscription?.Plan?.LimitUsers,
                    StorageLimit = subscription?.Plan?.StorageLimit,

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
                .Where(s => s.TenantId == tenantId && s.Status == "Active")
                .OrderByDescending(s => s.StartDate)
                .FirstOrDefault();

            var usage = GetTenantUsage(tenant);

            return new TenantWithSubscriptionRequest
            {
                TenantId = tenant.TenantId,
                TenantName = tenant.TenantName,
                SubDomain = tenant.SubDomain,
                IsActive = tenant.IsActive,

                ContactPerson = tenant.ContactPerson,
                Email = tenant.Email,
                PhoneNumber = tenant.PhoneNumber,
                Address = tenant.Address,

                PlanId = subscription?.PlanId,
                PlanName = subscription?.Plan?.PlanName,
                IsSubscribed = subscription != null && subscription.Status == "Active" && subscription.EndDate > DateTime.UtcNow,
                ExpiredAt = subscription?.EndDate,
                PlanIsActive = subscription?.Plan?.IsActive ?? true,

                LimitUsers = subscription?.Plan?.LimitUsers,
                StorageLimit = subscription?.Plan?.StorageLimit,

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

            // Fix connection string for Docker environment dynamically
            var baseConnStr = _configuration.GetConnectionString("DefaultTenantConnection");
            var baseBuilder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(baseConnStr);
            var tenantBuilder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(tenant.ConnectionString);
            
            baseBuilder.InitialCatalog = tenantBuilder.InitialCatalog;
            db.Database.SetConnectionString(baseBuilder.ConnectionString);

            int users = db.Users.Count();
            int students = db.Students.Count();
            int classes = db.Classes.Count();

            double storage = 0; // có thể tính từ file hoặc blob sau

            return (users, students, classes, storage);
        }
    }
}