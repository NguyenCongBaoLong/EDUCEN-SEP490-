namespace EducenAPI.Services.Interface
{
    public interface ITenantPaymentGatewayConfigService
    {
        Task<EffectivePaymentGatewayConfig> GetEffectiveConfigAsync(string tenantId, string gatewayType = "VNPay");

        /// <summary>
        /// Lấy global config từ appsettings.json (bỏ qua per-tenant config)
        /// Dùng cho subscription payment (SystemAdmin's VNPay)
        /// </summary>
        EffectivePaymentGatewayConfig GetGlobalConfig(string gatewayType = "VNPay");
    }

    public class EffectivePaymentGatewayConfig
    {
        public string GatewayType { get; set; } = "VNPay";
        public string TmnCode { get; set; } = string.Empty;
        public string HashSecret { get; set; } = string.Empty;
        public string BaseUrl { get; set; } = string.Empty;
        public string ApiUrl { get; set; } = string.Empty;
        public string ReturnUrl { get; set; } = string.Empty;
        public string FrontendReturnUrl { get; set; } = string.Empty;
        public string IpnUrl { get; set; } = string.Empty;
        public string Source { get; set; } = PaymentConfigSources.TenantConfig;
    }

    public static class PaymentConfigSources
    {
        public const string TenantConfig = "TenantConfig";
        public const string GlobalFallback = "GlobalFallback";
    }
}
