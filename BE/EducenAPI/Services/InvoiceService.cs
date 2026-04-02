using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class InvoiceService : IInvoiceService
    {
        private readonly EducenV2Context _context;
        private readonly ITuitionService _tuitionService;
        private readonly ILogger<InvoiceService> _logger;

        public InvoiceService(
            EducenV2Context context,
            ITuitionService tuitionService,
            ILogger<InvoiceService> logger)
        {
            _context = context;
            _tuitionService = tuitionService;
            _logger = logger;
        }

        public async Task<TuitionInvoice> CreateInvoiceAsync(CreateInvoiceRequest request)
        {
            // Check if invoice already exists for this student/class/month/year
            var existingInvoice = await _context.TuitionInvoices
                .FirstOrDefaultAsync(i =>
                    i.StudentId == request.StudentId &&
                    i.ClassId == request.ClassId &&
                    i.InvoiceMonth == request.Month &&
                    i.InvoiceYear == request.Year);

            if (existingInvoice != null)
                throw new Exception("Hóa đơn đã tồn tại cho học sinh, lớp học và tháng này.");

            // Calculate tuition
            var calculation = await _tuitionService.CalculateTuitionAsync(
                request.StudentId, request.ClassId, request.Month, request.Year);

            // Create invoice
            var invoice = new TuitionInvoice
            {
                InvoiceId = Guid.NewGuid().ToString(),
                StudentId = request.StudentId,
                ClassId = request.ClassId,
                InvoiceMonth = request.Month,
                InvoiceYear = request.Year,
                TotalSessions = calculation.TotalSessions,
                AttendedSessions = calculation.AttendedSessions,
                AbsentSessions = calculation.AbsentSessions,
                ExcusedSessions = calculation.ExcusedSessions,
                PricePerSession = calculation.PricePerSession,
                TotalAmount = calculation.TotalAmount,
                DiscountAmount = request.DiscountAmount ?? 0,
                FinalAmount = calculation.TotalAmount - (request.DiscountAmount ?? 0),
                Status = "Draft",
                DueDate = new DateTime(request.Year, request.Month, 1).AddMonths(1).AddDays(10), // Due 10th of next month
                CreatedAt = DateTime.UtcNow,
                CreatedBy = request.CreatedBy,
                Notes = request.Notes
            };

            // Add invoice items
            foreach (var detail in calculation.SessionDetails.Where(d => d.Amount > 0))
            {
                invoice.Items.Add(new TuitionInvoiceItem
                {
                    SessionId = detail.SessionId,
                    SessionDate = detail.SessionDate,
                    Status = detail.Status,
                    Amount = detail.Amount
                });
            }

            _context.TuitionInvoices.Add(invoice);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created invoice {InvoiceId} for student {StudentId}",
                invoice.InvoiceId, request.StudentId);

            return invoice;
        }

        public async Task<BatchInvoiceResult> CreateBatchInvoicesAsync(BatchInvoiceRequest request)
        {
            var result = new BatchInvoiceResult();
            var calculations = await _tuitionService.CalculateClassTuitionAsync(
                request.ClassId, request.Month, request.Year);

            // Lọc theo StudentIds nếu có
            if (request.StudentIds != null && request.StudentIds.Any())
            {
                calculations = calculations.Where(c => request.StudentIds.Contains(c.StudentId)).ToList();
            }

            result.TotalStudents = calculations.Count;

            foreach (var calc in calculations)
            {
                try
                {
                    // Skip if no sessions attended
                    if (calc.AttendedSessions == 0)
                    {
                        result.Errors.Add($"Học sinh {calc.StudentName} chưa tham gia buổi học nào.");
                        result.FailedCount++;
                        continue;
                    }

                    // Check if invoice already exists
                    var existing = await _context.TuitionInvoices
                        .FirstOrDefaultAsync(i =>
                            i.StudentId == calc.StudentId &&
                            i.ClassId == request.ClassId &&
                            i.InvoiceMonth == request.Month &&
                            i.InvoiceYear == request.Year);

                    if (existing != null)
                    {
                        result.Errors.Add($"Hóa đơn đã tồn tại cho học sinh {calc.StudentName}.");
                        result.FailedCount++;
                        continue;
                    }

                    // Create invoice
                    var invoice = await CreateInvoiceAsync(new CreateInvoiceRequest
                    {
                        StudentId = calc.StudentId,
                        ClassId = request.ClassId,
                        Month = request.Month,
                        Year = request.Year,
                        CreatedBy = request.CreatedBy
                    });

                    result.CreatedInvoiceIds.Add(invoice.InvoiceId);
                    result.SuccessCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error creating invoice for student {StudentId}", calc.StudentId);
                    result.Errors.Add($"Lỗi cho {calc.StudentName}: {ex.Message}");
                    result.FailedCount++;
                }
            }

            return result;
        }

        public async Task<TuitionInvoice?> GetInvoiceAsync(string invoiceId)
        {
            return await _context.TuitionInvoices
                .Include(i => i.Student)
                    .ThenInclude(s => s.StudentNavigation)
                .Include(i => i.Class)
                .Include(i => i.Items)
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);
        }

        public async Task<List<TuitionInvoice>> GetInvoicesAsync(InvoiceFilterRequest filter)
        {
            var studentId = NormalizePositiveInt(filter.StudentId);
            var classId = NormalizePositiveInt(filter.ClassId);
            var month = NormalizePositiveInt(filter.Month);
            var year = NormalizePositiveInt(filter.Year);
            var status = NormalizeString(filter.Status);

            var query = _context.TuitionInvoices
                .Include(i => i.Student)
                    .ThenInclude(s => s.StudentNavigation)
                .Include(i => i.Class)
                .AsQueryable();

            if (studentId.HasValue)
                query = query.Where(i => i.StudentId == studentId.Value);

            if (classId.HasValue)
                query = query.Where(i => i.ClassId == classId.Value);

            if (month.HasValue)
                query = query.Where(i => i.InvoiceMonth == month.Value);

            if (year.HasValue)
                query = query.Where(i => i.InvoiceYear == year.Value);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(i => i.Status == status);

            if (filter.FromDate.HasValue)
                query = query.Where(i => i.CreatedAt >= filter.FromDate.Value);

            if (filter.ToDate.HasValue)
                query = query.Where(i => i.CreatedAt <= filter.ToDate.Value);

            if (filter.IsOverdue.HasValue && filter.IsOverdue.Value)
                query = query.Where(i => i.Status == "Overdue" ||
                    (i.Status == "Sent" && i.DueDate < DateTime.UtcNow));

            return await query.OrderByDescending(i => i.CreatedAt).ToListAsync();
        }

        private static int? NormalizePositiveInt(int? value)
        {
            if (!value.HasValue || value.Value <= 0)
                return null;
            return value.Value;
        }

        private static string? NormalizeString(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return null;
            return value.Trim();
        }

        public async Task<bool> MarkAsPaidAsync(string invoiceId, string paymentRecordId)
        {
            var invoice = await _context.TuitionInvoices.FindAsync(invoiceId);
            if (invoice == null) return false;

            invoice.Status = "Paid";
            invoice.PaidAt = DateTime.UtcNow;
            invoice.PaymentRecordId = paymentRecordId;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> MarkInvoiceAsPaidAsync(string invoiceId, string paymentMethod, string? notes)
        {
            var invoice = await _context.TuitionInvoices.FindAsync(invoiceId);
            if (invoice == null) return false;

            if (invoice.Status == "Paid")
                return false; // Already paid

            invoice.Status = "Paid";
            invoice.PaidAt = DateTime.UtcNow;
            invoice.Notes = notes;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> CancelInvoiceAsync(string invoiceId, string reason)
        {
            var invoice = await _context.TuitionInvoices.FindAsync(invoiceId);
            if (invoice == null) return false;

            if (invoice.Status == "Paid")
                throw new Exception("Không thể hủy hóa đơn đã thanh toán.");

            invoice.Status = "Cancelled";
            invoice.UpdatedAt = DateTime.UtcNow;
            invoice.Notes = string.IsNullOrEmpty(invoice.Notes)
                ? $"Đã hủy: {reason}"
                : $"{invoice.Notes}\nĐã hủy: {reason}";

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SendInvoiceAsync(string invoiceId)
        {
            var invoice = await _context.TuitionInvoices.FindAsync(invoiceId);
            if (invoice == null) return false;

            if (invoice.Status == "Draft")
            {
                invoice.Status = "Sent";
                invoice.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            // TODO: Send email notification to student/parent
            _logger.LogInformation("Invoice {InvoiceId} sent to student {StudentId}",
                invoiceId, invoice.StudentId);

            return true;
        }

        public async Task<List<TuitionInvoice>> GetUpcomingDueInvoicesAsync(int daysBefore)
        {
            var targetDate = DateTime.UtcNow.AddDays(daysBefore).Date;

            return await _context.TuitionInvoices
                .Include(i => i.Student)
                    .ThenInclude(s => s.StudentNavigation)
                .Include(i => i.Class)
                .Where(i => i.Status == "Sent" &&
                           i.DueDate.Date == targetDate)
                .ToListAsync();
        }

        /// <summary>
        /// Cập nhật tự động các hóa đơn quá hạn
        /// Chạy hàng ngày để cập nhật status từ "Sent" -> "Overdue"
        /// </summary>
        public async Task<int> UpdateOverdueInvoicesAsync()
        {
            var overdueInvoices = await _context.TuitionInvoices
                .Where(i => i.Status == "Sent" && i.DueDate < DateTime.UtcNow)
                .ToListAsync();

            if (overdueInvoices.Any())
            {
                foreach (var invoice in overdueInvoices)
                {
                    invoice.Status = "Overdue";
                    invoice.UpdatedAt = DateTime.UtcNow;
                    
                    _logger.LogInformation("Invoice {InvoiceId} marked as overdue. DueDate: {DueDate}, Current: {CurrentDate}",
                        invoice.InvoiceId, invoice.DueDate, DateTime.UtcNow);
                }

                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Updated {Count} invoices to overdue status", overdueInvoices.Count);
            }

            return overdueInvoices.Count;
        }
    }
}
