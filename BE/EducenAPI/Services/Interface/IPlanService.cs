using EducenAPI.DTOs.Plans;
using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface IPlanService
    {
        Task<List<Plan>> GetAllPlansAsync(bool includeInactive = false);

        Task<Plan?> GetPlanByIdAsync(string id);

        Task<Plan> CreatePlanAsync(CreatePlanRequest request);

        Task<bool> UpdatePlanAsync(string id, UpdatePlanRequest request);

        Task<bool> DeletePlanAsync(string id);

        Task<bool> SetPlanActiveStatusAsync(string id, bool isActive);
    }
}
