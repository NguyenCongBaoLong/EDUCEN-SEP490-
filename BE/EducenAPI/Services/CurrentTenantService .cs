using EducenAPI.Persistence.Contexts;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class CurrentTenantService : ICurrentTenantService
    {
        private readonly AdminDbContext _context;
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

        public CurrentTenantService(AdminDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<bool> SetTenant(string tenant)
        {
            var tenantInfo = await _context.Tenants
                .FirstOrDefaultAsync(x => x.TenantId == tenant);

            if (tenantInfo == null)
                throw new Exception("Tenant invalid");

            TenantId = tenantInfo.TenantId;
            ConnectionString = tenantInfo.ConnectionString;

            return true;
        }
    }
}