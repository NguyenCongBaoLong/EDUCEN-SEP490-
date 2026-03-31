using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Tenant
{
    public class CreatePaymentGatewayConfigRequest
    {
        [Required]
        public string TenantId { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string GatewayType { get; set; } = "VNPay";

        [MaxLength(150)]
        public string? DisplayName { get; set; }

        [Required]
        public PaymentGatewayConfigDataDto ConfigData { get; set; } = new();
    }

    public class UpdatePaymentGatewayConfigRequest
    {
        [MaxLength(150)]
        public string? DisplayName { get; set; }

        public PaymentGatewayConfigDataDto? ConfigData { get; set; }

        [MaxLength(30)]
        public string? Status { get; set; }

        [MaxLength(500)]
        public string? StatusReason { get; set; }
    }

    public class PaymentGatewayConfigDataDto
    {
        [Required]
        public string TmnCode { get; set; } = string.Empty;

        [Required]
        public string HashSecret { get; set; } = string.Empty;

        [Required]
        public string BaseUrl { get; set; } = string.Empty;

        [Required]
        public string ApiUrl { get; set; } = string.Empty;

        [Required]
        public string ReturnUrl { get; set; } = string.Empty;

        [Required]
        public string FrontendReturnUrl { get; set; } = string.Empty;

        [Required]
        public string IpnUrl { get; set; } = string.Empty;
    }

    public class PaymentGatewayConfigResponse
    {
        public string ConfigId { get; set; } = string.Empty;
        public string TenantId { get; set; } = string.Empty;
        public string? TenantName { get; set; }
        public string GatewayType { get; set; } = string.Empty;
        public string? DisplayName { get; set; }
        public PaymentGatewayConfigDataDto ConfigData { get; set; } = new();
        public string Status { get; set; } = string.Empty;
        public string? StatusReason { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? ActivatedAt { get; set; }
        public DateTime? DeactivatedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
    }
}
