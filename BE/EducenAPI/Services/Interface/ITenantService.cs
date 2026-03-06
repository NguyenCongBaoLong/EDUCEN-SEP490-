using EducenAPI.Models;
using EducenAPI.DTOs;
using EducenAPI.DTOs.Tenant;

namespace EducenAPI.Services.TenantService
{
    public interface ITenantService
    {
        Tenant CreateTenant(CreateTenantRequest request);
        IEnumerable<Tenant> GetAllTenants();

        Tenant? GetTenantById(string tenantId);

        Tenant? UpdateTenant(string tenantId, UpdateTenantRequest request);
    }
}