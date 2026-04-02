using EducenAPI.Models;
using EducenAPI.DTOs;
using EducenAPI.DTOs.Tenant;
using System.Threading.Tasks;

namespace EducenAPI.Services.TenantService
{
    public interface ITenantService
    {
        Task<Tenant> CreateTenant(CreateTenantRequest request);
        IEnumerable<Tenant> GetAllTenants();

        Tenant? GetTenantById(string tenantId);

        Tenant? UpdateTenant(string tenantId, UpdateTenantRequest request);
        IEnumerable<TenantWithSubscriptionRequest> GetAllTenantDetails();

        TenantWithSubscriptionRequest? GetTenantDetails(string tenantId);
        Task<object> CreateAdminForTenantAsync(string tenantId, CreateTenantAdminDto dto);
        Task<List<object>> GetTenantAdminsAsync(string tenantId);
    }
}