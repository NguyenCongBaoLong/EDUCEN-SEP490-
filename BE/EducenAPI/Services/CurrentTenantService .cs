using EducenAPI.Persistence.Contexts;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class CurrentTenantService : ICurrentTenantService
    {
        private readonly AdminDbContext _context;
        private readonly IConfiguration _configuration;

        public string? TenantId 
        { 
            get => _httpContextAccessor?.HttpContext?.Items[TENANT_KEY] as string;
            set => _httpContextAccessor!.HttpContext!.Items[TENANT_KEY] = value;
        }
        
        public string? ConnectionString 
        { 
            get => _httpContextAccessor?.HttpContext?.Items[CONNECTION_KEY] as string;
            set => _httpContextAccessor!.HttpContext!.Items[CONNECTION_KEY] = value;
        }

        public CurrentTenantService(AdminDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<bool> SetTenant(string tenant)
        {
            var tenantInfo = await _context.Tenants
                .FirstOrDefaultAsync(x => x.TenantId == tenant);

            if (tenantInfo == null)
                throw new Exception("Tenant invalid");

            TenantId = tenantInfo.TenantId;
            
            // Rebuild the connection string targeting the correct host dynamically
            var baseConnStr = _configuration.GetConnectionString("DefaultTenantConnection");
            var baseBuilder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(baseConnStr);
            var tenantBuilder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(tenantInfo.ConnectionString);
            
            baseBuilder.InitialCatalog = tenantBuilder.InitialCatalog;
            ConnectionString = baseBuilder.ConnectionString;

            return true;
        }
    }
}