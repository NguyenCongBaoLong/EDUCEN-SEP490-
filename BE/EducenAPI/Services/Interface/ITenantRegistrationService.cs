using EducenAPI.DTOs.TenantRegistrations;
using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface ITenantRegistrationService
    {
        Task<TenantRegistration> CreateRegistrationAsync(CreateRegistrationRequest request);

        Task<List<TenantRegistration>> GetAllAsync();

        Task<bool> UpdateStatusAsync(string id, string status);
    }
}