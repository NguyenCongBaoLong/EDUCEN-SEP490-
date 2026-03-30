using EducenAPI.Services.Interface;

namespace EducenAPI.Services.Payment
{
    /// <summary>
    /// Factory để lấy instance của Payment Gateway tương ứng
    /// </summary>
    public class PaymentGatewayFactory
    {
        private readonly IServiceProvider _serviceProvider;

        public PaymentGatewayFactory(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        public IPaymentGateway GetGateway(string gatewayType)
        {
            return gatewayType?.ToLower() switch
            {
                "vnpay" => _serviceProvider.GetRequiredService<VNPayService>(),
                _ => throw new ArgumentException($"Unsupported payment gateway: {gatewayType}. Only VNPay is supported.")
            };
        }

        public List<string> GetAvailableGateways()
        {
            return new List<string> { "VNPay" };
        }
    }
}
