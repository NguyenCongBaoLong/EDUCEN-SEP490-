using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Subscription
{
    public class RegisterSubscriptionRequestDTO
    {
        [Required(ErrorMessage = "TenantId là bắt buộc.")]
        public string TenantId { get; set; }

        [Required(ErrorMessage = "PlanId là bắt buộc.")]
        public string PlanId { get; set; }
    }
}
