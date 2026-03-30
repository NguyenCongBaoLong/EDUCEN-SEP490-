namespace EducenAPI.Services.Interface
{
    /// <summary>
    /// Service xử lý hoàn tiền - Chỉ áp dụng cho System Admin ↔ Center (Subscription)
    /// </summary>
    public interface IRefundService
    {
        /// <summary>
        /// Tạo yêu cầu hoàn tiền mới
        /// </summary>
        Task<Models.RefundRequest> CreateRefundRequestAsync(CreateRefundRequest request);

        /// <summary>
        /// Phê duyệt yêu cầu hoàn tiền
        /// </summary>
        Task<Models.RefundRequest> ApproveRefundAsync(string refundId, int approvedBy, string? notes = null);

        /// <summary>
        /// Từ chối yêu cầu hoàn tiền
        /// </summary>
        Task<Models.RefundRequest> RejectRefundAsync(string refundId, string reason, int rejectedBy);

        /// <summary>
        /// Xử lý hoàn tiền qua cổng thanh toán
        /// </summary>
        Task<Models.RefundRequest> ProcessRefundAsync(string refundId);

        /// <summary>
        /// Lấy chi tiết yêu cầu hoàn tiền
        /// </summary>
        Task<Models.RefundRequest?> GetRefundRequestAsync(string refundId);

        /// <summary>
        /// Lấy danh sách yêu cầu hoàn tiền theo filter
        /// </summary>
        Task<List<Models.RefundRequest>> GetRefundRequestsAsync(RefundFilterRequest filter);

        /// <summary>
        /// Kiểm tra xem payment có đủ điều kiện hoàn tiền không
        /// </summary>
        Task<bool> CanRefundAsync(string paymentRecordId);
    }

    public class CreateRefundRequest
    {
        public string PaymentRecordId { get; set; } = string.Empty;
        public string? SubscriptionId { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public int RequestedBy { get; set; }
        public string Reason { get; set; } = string.Empty;
        public decimal RefundAmount { get; set; }
        public string? RefundMethod { get; set; }
        public string? GatewayRef { get; set; }
        public bool IsServiceIssue { get; set; } = false;
    }

    public class RefundFilterRequest
    {
        public string? TenantId { get; set; }
        public string? Status { get; set; }
        public int? RequestedBy { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }
}
