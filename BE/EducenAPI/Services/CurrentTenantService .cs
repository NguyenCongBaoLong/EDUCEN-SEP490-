using EducenAPI.Persistence.Contexts;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;

namespace EducenAPI.Services
{
    public class CurrentTenantService : ICurrentTenantService
    {
        private readonly AdminDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IHttpContextAccessor _httpContextAccessor;
        
        private const string TENANT_KEY = "TenantId";
        private const string CONNECTION_KEY = "ConnectionString";

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

        public CurrentTenantService(AdminDbContext context, IConfiguration configuration, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _configuration = configuration;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<bool> SetTenant(string tenant)
        {
            if (string.IsNullOrEmpty(tenant))
                return false;

            var tenantInfo = await _context.Tenants
                .FirstOrDefaultAsync(x => x.TenantId == tenant);

            if (tenantInfo == null)
            {
                // Don't throw - just return false and use default connection
                return false;
            }

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