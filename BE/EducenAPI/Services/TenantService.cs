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
                DomainUrl = request.DomainUrl,
                ConnectionString = modifiedConnectionString,
                IsActive = true
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
            tenant.DomainUrl = request.DomainUrl;
            tenant.IsActive = request.IsActive;

            _adminDbContext.SaveChanges();

            return tenant;
        }
    }
}