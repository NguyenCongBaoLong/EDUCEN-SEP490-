using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface IInvoiceService
    {
        /// <summary>
        /// Tạo hóa đơn học phí cho một học sinh
        /// </summary>
        Task<TuitionInvoice> CreateInvoiceAsync(CreateInvoiceRequest request);

        /// <summary>
        /// Tạo hóa đơn hàng loạt cho cả lớp
        /// </summary>
        Task<BatchInvoiceResult> CreateBatchInvoicesAsync(BatchInvoiceRequest request);

        /// <summary>
        /// Lấy chi tiết hóa đơn
        /// </summary>
        Task<TuitionInvoice?> GetInvoiceAsync(string invoiceId);

        /// <summary>
        /// Lấy danh sách hóa đơn theo filter
        /// </summary>
        Task<List<TuitionInvoice>> GetInvoicesAsync(InvoiceFilterRequest filter);

        /// <summary>
        /// Cập nhật trạng thái hóa đơn thành Paid
        /// </summary>
        Task<bool> MarkAsPaidAsync(string invoiceId, string paymentRecordId);

        /// <summary>
        /// Hủy hóa đơn
        /// </summary>
        Task<bool> CancelInvoiceAsync(string invoiceId, string reason);

        /// <summary>
        /// Gửi hóa đơn cho học sinh/phụ huynh
        /// </summary>
        Task<bool> SendInvoiceAsync(string invoiceId);

        /// <summary>
        /// Lấy danh sách hóa đơn sắp đến hạn (để gửi nhắc nhở)
        /// </summary>
        Task<List<TuitionInvoice>> GetUpcomingDueInvoicesAsync(int daysBefore);
    }

    public class CreateInvoiceRequest
    {
        public int StudentId { get; set; }
        public int ClassId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public decimal? DiscountAmount { get; set; }
        public string? Notes { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
    }

    public class BatchInvoiceRequest
    {
        public int ClassId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
    }

    public class BatchInvoiceResult
    {
        public int TotalStudents { get; set; }
        public int SuccessCount { get; set; }
        public int FailedCount { get; set; }
        public List<string> CreatedInvoiceIds { get; set; } = new();
        public List<string> Errors { get; set; } = new();
    }

    public class InvoiceFilterRequest
    {
        public int? StudentId { get; set; }
        public int? ClassId { get; set; }
        public int? Month { get; set; }
        public int? Year { get; set; }
        public string? Status { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public bool? IsOverdue { get; set; }
    }
}
