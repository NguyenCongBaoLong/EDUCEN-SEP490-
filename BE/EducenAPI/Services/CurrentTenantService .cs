using EducenAPI.Persistence.Contexts;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class CurrentTenantService : ICurrentTenantService
    {
        private readonly AdminDbContext _context;

        public string? TenantId { get; set; }
        public string? ConnectionString { get; set; }

        public CurrentTenantService(AdminDbContext context)
        {
            _context = context;
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