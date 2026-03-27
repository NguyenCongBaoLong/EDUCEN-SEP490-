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
                throw new Exception("Invoice already exists for this student, class and month");

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

            result.TotalStudents = calculations.Count;

            foreach (var calc in calculations)
            {
                try
                {
                    // Skip if no sessions attended
                    if (calc.AttendedSessions == 0)
                    {
                        result.Errors.Add($"Student {calc.StudentName} has no attended sessions");
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
                        result.Errors.Add($"Invoice already exists for student {calc.StudentName}");
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
                    result.Errors.Add($"Error for {calc.StudentName}: {ex.Message}");
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
            var query = _context.TuitionInvoices
                .Include(i => i.Student)
                    .ThenInclude(s => s.StudentNavigation)
                .Include(i => i.Class)
                .AsQueryable();

            if (filter.StudentId.HasValue)
                query = query.Where(i => i.StudentId == filter.StudentId.Value);

            if (filter.ClassId.HasValue)
                query = query.Where(i => i.ClassId == filter.ClassId.Value);

            if (filter.Month.HasValue)
                query = query.Where(i => i.InvoiceMonth == filter.Month.Value);

            if (filter.Year.HasValue)
                query = query.Where(i => i.InvoiceYear == filter.Year.Value);

            if (!string.IsNullOrEmpty(filter.Status))
                query = query.Where(i => i.Status == filter.Status);

            if (filter.FromDate.HasValue)
                query = query.Where(i => i.CreatedAt >= filter.FromDate.Value);

            if (filter.ToDate.HasValue)
                query = query.Where(i => i.CreatedAt <= filter.ToDate.Value);

            if (filter.IsOverdue.HasValue && filter.IsOverdue.Value)
                query = query.Where(i => i.Status == "Overdue" ||
                    (i.Status == "Sent" && i.DueDate < DateTime.UtcNow));

            return await query.OrderByDescending(i => i.CreatedAt).ToListAsync();
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

        public async Task<bool> CancelInvoiceAsync(string invoiceId, string reason)
        {
            var invoice = await _context.TuitionInvoices.FindAsync(invoiceId);
            if (invoice == null) return false;

            if (invoice.Status == "Paid")
                throw new Exception("Cannot cancel a paid invoice");

            invoice.Status = "Cancelled";
            invoice.UpdatedAt = DateTime.UtcNow;
            invoice.Notes = string.IsNullOrEmpty(invoice.Notes)
                ? $"Cancelled: {reason}"
                : $"{invoice.Notes}\nCancelled: {reason}";

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
    }
}
