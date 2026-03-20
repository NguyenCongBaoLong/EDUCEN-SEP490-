using EducenAPI.DTOs.Subscription;

namespace EducenAPI.Services.Interface
{
    public interface ISubscriptionService
    {
        Task<SubscriptionResponseDTO> RegisterSubscription(RegisterSubscriptionRequestDTO request);

        Task<SubscriptionResponseDTO> RenewSubscription(RenewSubscriptionRequestDTO request);

        Task<SubscriptionResponseDTO> ChangePlan(ChangePlanRequestDTO request);
    }
}
