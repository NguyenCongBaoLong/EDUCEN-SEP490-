using EducenAPI.DTOs.Subscription;

namespace EducenAPI.Services.Interface
{
    public interface ISubscriptionService
    {
        Task<SubscriptionResponseDTO> RegisterSubscription(RegisterSubscriptionRequestDTO request);
        Task<bool> CancelSubscription(string tenantId);
    }
}
