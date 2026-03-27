namespace EducenAPI.Services.Interface
{
    /// <summary>
    /// Interface chung cho tất cả các cổng thanh toán
    /// </summary>
    public interface IPaymentGateway
    {
        string GatewayName { get; }

        /// <summary>
        /// Tạo URL thanh toán
        /// </summary>
        Task<PaymentGatewayResponse> CreatePaymentAsync(CreatePaymentRequest request);

        /// <summary>
        /// Xác thực callback từ cổng thanh toán (IPN)
        /// </summary>
        Task<PaymentVerificationResult> VerifyCallbackAsync(Dictionary<string, string> callbackData);

        /// <summary>
        /// Xử lý hoàn tiền
        /// </summary>
        Task<RefundResponse> ProcessRefundAsync(RefundRequest request);
    }

    public class CreatePaymentRequest
    {
        public string OrderId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Description { get; set; } = string.Empty;
        public string ReturnUrl { get; set; } = string.Empty;
        public string IpAddress { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public string? CustomerPhone { get; set; }
    }

    public class PaymentGatewayResponse
    {
        public bool Success { get; set; }
        public string? PaymentUrl { get; set; }
        public string? QrCodeUrl { get; set; }
        public string? Deeplink { get; set; }
        public string? TransactionId { get; set; }
        public string? ErrorMessage { get; set; }
        public Dictionary<string, object>? AdditionalData { get; set; }
    }

    public class PaymentVerificationResult
    {
        public bool IsValid { get; set; }
        public bool IsSuccessful { get; set; }
        public string? TransactionId { get; set; }
        public string? OrderId { get; set; }
        public decimal Amount { get; set; }
        public string? GatewayTransactionId { get; set; }
        public string? ResponseCode { get; set; }
        public string? Message { get; set; }
        public Dictionary<string, object>? AdditionalData { get; set; }
    }

    public class RefundRequest
    {
        public string OriginalTransactionId { get; set; } = string.Empty;
        public string OrderId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public class RefundResponse
    {
        public bool Success { get; set; }
        public string? RefundTransactionId { get; set; }
        public string? ErrorMessage { get; set; }
        public Dictionary<string, object>? AdditionalData { get; set; }
    }
}
