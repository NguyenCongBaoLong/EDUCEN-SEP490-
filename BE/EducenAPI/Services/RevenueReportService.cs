using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace EducenAPI.Services
{
    public class RevenueReportService : IRevenueReportService
    {
        private readonly EducenV2Context _tenantContext;
        private readonly AdminDbContext _adminContext;
        private readonly ILogger<RevenueReportService> _logger;

        public RevenueReportService(
            EducenV2Context tenantContext,
            AdminDbContext adminContext,
            ILogger<RevenueReportService> logger)
        {
            _tenantContext = tenantContext;
            _adminContext = adminContext;
            _logger = logger;
        }

        public async Task<RevenueSummaryDto> GetRevenueSummaryAsync(string tenantId, DateTime fromDate, DateTime toDate)
        {
            var invoices = await _tenantContext.TuitionInvoices
                .Where(i => i.CreatedAt >= fromDate &&
                           i.CreatedAt <= toDate)
                .ToListAsync();

            var totalRevenue = invoices.Where(i => i.Status == "Paid").Sum(i => i.FinalAmount);
            var totalPaid = totalRevenue;
            var totalOutstanding = invoices
                .Where(i => i.Status == "Sent" || i.Status == "Overdue")
                .Sum(i => i.FinalAmount);

            return new RevenueSummaryDto
            {
                TenantId = tenantId,
                FromDate = fromDate,
                ToDate = toDate,
                TotalTuitionRevenue = totalRevenue,
                TotalSubscriptionRevenue = 0, // Fetched from admin context separately if needed
                TotalRevenue = totalRevenue,
                TotalPaid = totalPaid,
                TotalOutstanding = totalOutstanding,
                TotalInvoices = invoices.Count,
                PaidInvoices = invoices.Count(i => i.Status == "Paid"),
                UnpaidInvoices = invoices.Count(i => i.Status == "Sent"),
                OverdueInvoices = invoices.Count(i => i.Status == "Overdue")
            };
        }

        public async Task<List<RevenueByMonthDto>> GetRevenueByMonthAsync(string tenantId, int year)
        {
            var invoices = await _tenantContext.TuitionInvoices
                .Where(i => i.InvoiceYear == year)
                .ToListAsync();

            var result = new List<RevenueByMonthDto>();

            for (int month = 1; month <= 12; month++)
            {
                var monthInvoices = invoices.Where(i => i.InvoiceMonth == month).ToList();
                result.Add(new RevenueByMonthDto
                {
                    Year = year,
                    Month = month,
                    TuitionRevenue = monthInvoices.Where(i => i.Status == "Paid").Sum(i => i.FinalAmount),
                    SubscriptionRevenue = 0,
                    TotalRevenue = monthInvoices.Where(i => i.Status == "Paid").Sum(i => i.FinalAmount),
                    InvoiceCount = monthInvoices.Count
                });
            }

            return result;
        }

        public async Task<List<RevenueByClassDto>> GetRevenueByClassAsync(string tenantId, int month, int year)
        {
            var invoices = await _tenantContext.TuitionInvoices
                .Include(i => i.Class)
                .Where(i => i.InvoiceMonth == month &&
                           i.InvoiceYear == year)
                .ToListAsync();

            var classGroups = invoices.GroupBy(i => i.ClassId);
            var result = new List<RevenueByClassDto>();

            foreach (var group in classGroups)
            {
                var classEntity = await _tenantContext.Classes
                    .FirstOrDefaultAsync(c => c.ClassId == group.Key);

                if (classEntity != null)
                {
                    result.Add(new RevenueByClassDto
                    {
                        ClassId = group.Key,
                        ClassName = classEntity.ClassName ?? $"Class {group.Key}",
                        StudentCount = group.Select(i => i.StudentId).Distinct().Count(),
                        TotalSessions = group.Sum(i => i.AttendedSessions),
                        TotalRevenue = group.Sum(i => i.FinalAmount),
                        PaidAmount = group.Where(i => i.Status == "Paid").Sum(i => i.FinalAmount),
                        OutstandingAmount = group.Where(i => i.Status != "Paid").Sum(i => i.FinalAmount)
                    });
                }
            }

            return result.OrderByDescending(r => r.TotalRevenue).ToList();
        }

        public async Task<List<OutstandingPaymentDto>> GetOutstandingPaymentsAsync(string tenantId)
        {
            var invoices = await _tenantContext.TuitionInvoices
                .Include(i => i.Student)
                    .ThenInclude(s => s.StudentNavigation)
                .Include(i => i.Class)
                .Where(i => (i.Status == "Sent" || i.Status == "Overdue"))
                .OrderBy(i => i.DueDate)
                .ToListAsync();

            return invoices.Select(i => new OutstandingPaymentDto
            {
                InvoiceId = i.InvoiceId,
                StudentId = i.StudentId,
                StudentName = i.Student.StudentNavigation?.FullName ?? "Unknown",
                StudentEmail = i.Student.Email,
                StudentPhone = i.Student.StudentNavigation?.PhoneNumber,
                ClassName = i.Class.ClassName ?? "Unknown",
                InvoiceMonth = i.InvoiceMonth,
                InvoiceYear = i.InvoiceYear,
                Amount = i.FinalAmount,
                DueDate = i.DueDate,
                DaysOverdue = i.Status == "Overdue" || i.DueDate < DateTime.UtcNow
                    ? (DateTime.UtcNow - i.DueDate).Days
                    : 0
            }).ToList();
        }

        public async Task<SystemRevenueReportDto> GetSystemRevenueReportAsync(DateTime fromDate, DateTime toDate)
        {
            var payments = await _adminContext.PaymentRecords
                .Where(p => p.PaymentDate >= fromDate &&
                           p.PaymentDate <= toDate &&
                           p.TransactionType == "Subscription")
                .ToListAsync();

            var refunds = await _adminContext.RefundRequests
                .Where(r => r.ProcessedAt >= fromDate &&
                           r.ProcessedAt <= toDate &&
                           r.Status == "Completed")
                .ToListAsync();

            var tenants = await _adminContext.Tenants.ToListAsync();

            var tenantRevenues = new List<TenantRevenueDto>();
            foreach (var tenant in tenants)
            {
                var tenantPayments = payments.Where(p => p.TenantId == tenant.TenantId).ToList();
                var tenantRefunds = refunds.Where(r => r.TenantId == tenant.TenantId).ToList();

                tenantRevenues.Add(new TenantRevenueDto
                {
                    TenantId = tenant.TenantId,
                    TenantName = tenant.TenantName,
                    SubscriptionRevenue = tenantPayments.Where(p => p.Status == "Paid").Sum(p => p.Amount)
                                          - tenantRefunds.Sum(r => r.RefundAmount),
                    RefundAmount = tenantRefunds.Sum(r => r.RefundAmount),
                    LastPaymentDate = tenantPayments.Where(p => p.Status == "Paid").Max(p => (DateTime?)p.PaymentDate),
                    Status = tenant.IsActive ? "Active" : "Inactive"
                });
            }

            var totalRevenue = tenantRevenues.Sum(t => t.SubscriptionRevenue);
            var totalRefunds = tenantRevenues.Sum(t => t.RefundAmount);
            var totalNetRevenue = totalRevenue;

            return new SystemRevenueReportDto
            {
                FromDate = fromDate,
                ToDate = toDate,
                TotalTenants = tenants.Count,
                TotalSubscriptionRevenue = totalNetRevenue,
                TotalRefundAmount = totalRefunds,
                NetRevenue = totalNetRevenue,
                TenantRevenues = tenantRevenues
            };
        }

        public async Task<byte[]> ExportRevenueReportAsync(RevenueExportRequest request)
        {
            // Simple CSV export for now
            // TODO: Implement proper Excel export using EPPlus or ClosedXML

            var csv = new System.Text.StringBuilder();
            csv.AppendLine("Report Type,Tenant ID,From Date,To Date");
            csv.AppendLine($"{request.ReportType},{request.TenantId},{request.FromDate:yyyy-MM-dd},{request.ToDate:yyyy-MM-dd}");
            csv.AppendLine();

            switch (request.ReportType)
            {
                case "Summary":
                    var summary = await GetRevenueSummaryAsync(request.TenantId, request.FromDate, request.ToDate);
                    csv.AppendLine("Total Revenue,Total Paid,Total Outstanding,Total Invoices,Paid,Unpaid,Overdue");
                    csv.AppendLine($"{summary.TotalRevenue},{summary.TotalPaid},{summary.TotalOutstanding},{summary.TotalInvoices},{summary.PaidInvoices},{summary.UnpaidInvoices},{summary.OverdueInvoices}");
                    break;

                case "Outstanding":
                    var outstanding = await GetOutstandingPaymentsAsync(request.TenantId);
                    csv.AppendLine("Invoice ID,Student Name,Class,Month/Year,Amount,Due Date,Days Overdue");
                    foreach (var item in outstanding)
                    {
                        csv.AppendLine($"{item.InvoiceId},{item.StudentName},{item.ClassName},{item.InvoiceMonth}/{item.InvoiceYear},{item.Amount},{item.DueDate:yyyy-MM-dd},{item.DaysOverdue}");
                    }
                    break;
            }

            return System.Text.Encoding.UTF8.GetBytes(csv.ToString());
        }
    }
}
