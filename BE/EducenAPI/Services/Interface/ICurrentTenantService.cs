namespace EducenAPI.Services
{
    public interface ICurrentTenantService
    {
        string? TenantId { get; set; }
        public Task<bool> SetTenant(string tenant);
        string? ConnectionString { get; set; }

    }
}
