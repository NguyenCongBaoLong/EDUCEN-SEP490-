using EducenAPI.Models;
using EducenAPI.DTOs;

namespace EducenAPI.Services.TenantService
{
    public interface ITenantService
    {
        Tenant CreateTenant(CreateTenantRequest request);
    }
}