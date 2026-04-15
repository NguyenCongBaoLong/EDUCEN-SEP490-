using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Subscription
{
    public class RenewSubscriptionRequestDTO
    {
        [Required(ErrorMessage = "TenantId là bắt buộc.")]
        public string TenantId { get; set; }

        [Range(1, 120, ErrorMessage = "Số tháng phải từ 1 đến 120.")]
        public int Months { get; set; }
    }

    public class ChangePlanRequestDTO
    {
        public string TenantId { get; set; }

        [Required(ErrorMessage = "NewPlanId là bắt buộc.")]
        public string NewPlanId { get; set; }

        [Range(1, 120, ErrorMessage = "Số tháng phải từ 1 đến 120.")]
        public int Months { get; set; }

        /// <summary>
        /// Áp dụng ngay (true) hoặc hiệu lực kỳ sau (false - mặc định)
        /// </summary>
        public bool EffectiveImmediately { get; set; } = false;
    }
}
