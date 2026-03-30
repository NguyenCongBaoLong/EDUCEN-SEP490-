namespace EducenAPI.Services.Interface
{
    /// <summary>
    /// Service báo cáo doanh thu
    /// </summary>
    public interface IRevenueReportService
    {
        /// <summary>
        /// Tổng quan doanh thu theo tenant
        /// </summary>
        Task<RevenueSummaryDto> GetRevenueSummaryAsync(string tenantId, DateTime fromDate, DateTime toDate);

        /// <summary>
        /// Doanh thu theo tháng
        /// </summary>
        Task<List<RevenueByMonthDto>> GetRevenueByMonthAsync(string tenantId, int year);

        /// <summary>
        /// Doanh thu theo lớp học
        /// </summary>
        Task<List<RevenueByClassDto>> GetRevenueByClassAsync(string tenantId, int month, int year);

        /// <summary>
        /// Danh sách công nợ chưa thu
        /// </summary>
        Task<List<OutstandingPaymentDto>> GetOutstandingPaymentsAsync(string tenantId);

        /// <summary>
        /// Báo cáo tổng hợp cho System Admin
        /// </summary>
        Task<SystemRevenueReportDto> GetSystemRevenueReportAsync(DateTime fromDate, DateTime toDate);

        /// <summary>
        /// Xuất báo cáo Excel
        /// </summary>
        Task<byte[]> ExportRevenueReportAsync(RevenueExportRequest request);
    }

    public class RevenueSummaryDto
    {
        public string TenantId { get; set; } = string.Empty;
        public string TenantName { get; set; } = string.Empty;
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalTuitionRevenue { get; set; }
        public decimal TotalSubscriptionRevenue { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal TotalOutstanding { get; set; }
        public int TotalInvoices { get; set; }
        public int PaidInvoices { get; set; }
        public int UnpaidInvoices { get; set; }
        public int OverdueInvoices { get; set; }
    }

    public class RevenueByMonthDto
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public decimal TuitionRevenue { get; set; }
        public decimal SubscriptionRevenue { get; set; }
        public decimal TotalRevenue { get; set; }
        public int InvoiceCount { get; set; }
    }

    public class RevenueByClassDto
    {
        public int ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public int StudentCount { get; set; }
        public int TotalSessions { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal OutstandingAmount { get; set; }
    }

    public class OutstandingPaymentDto
    {
        public string InvoiceId { get; set; } = string.Empty;
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string? StudentEmail { get; set; }
        public string? StudentPhone { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public int InvoiceMonth { get; set; }
        public int InvoiceYear { get; set; }
        public decimal Amount { get; set; }
        public DateTime DueDate { get; set; }
        public int DaysOverdue { get; set; }
    }

    public class SystemRevenueReportDto
    {
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int TotalTenants { get; set; }
        public decimal TotalSubscriptionRevenue { get; set; }
        public decimal TotalRefundAmount { get; set; }
        public decimal NetRevenue { get; set; }
        public List<TenantRevenueDto> TenantRevenues { get; set; } = new();
    }

    public class TenantRevenueDto
    {
        public string TenantId { get; set; } = string.Empty;
        public string TenantName { get; set; } = string.Empty;
        public decimal SubscriptionRevenue { get; set; }
        public decimal RefundAmount { get; set; }
        public DateTime? LastPaymentDate { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class RevenueExportRequest
    {
        public string TenantId { get; set; } = string.Empty;
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string ReportType { get; set; } = "Summary"; // Summary | ByClass | ByMonth | Outstanding
    }
}
