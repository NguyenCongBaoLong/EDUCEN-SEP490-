

namespace EducenAPI.Services
{
    public class MigrationTenantService : ICurrentTenantService
    {
        public string? TenantId { get; set; }
        public string? ConnectionString { get; set; }

        public MigrationTenantService(string tenantId, string connectionString)
        {
            TenantId = tenantId;
            ConnectionString = connectionString;
        }

        public Task<bool> SetTenant(string tenant)
            => Task.FromResult(true);
    }
}
