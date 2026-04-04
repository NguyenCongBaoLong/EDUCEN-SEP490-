using EducenAPI.DTOs.Subscription;
using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface ISubscriptionService
    {
        Task<SubscriptionResponseDTO> RegisterSubscription(RegisterSubscriptionRequestDTO request);
        
        /// <summary>
        /// Hủy gói dịch vụ
        /// </summary>
        /// <param name="tenantId">Tenant ID</param>
        /// <param name="immediate">Hủy ngay (true) hay cuối kỳ (false)</param>
        /// <param name="createCredit">Tạo credit khi hủy ngay (true)</param>
        Task<bool> CancelSubscription(string tenantId, bool immediate = false, bool createCredit = false);

        Task<SubscriptionResponseDTO> RenewSubscription(RenewSubscriptionRequestDTO request);

        Task<SubscriptionResponseDTO> ChangePlan(ChangePlanRequestDTO request);

        Task<SubscriptionResponseDTO?> GetActiveSubscriptionAsync(string tenantId);
    }
}
