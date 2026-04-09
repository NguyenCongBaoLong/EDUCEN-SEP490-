using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public interface ISubscriptionChangeService
    {
        // Center: Yêu cầu đổi gói
        Task<PackageChangeRequest> CreatePackageChangeRequestAsync(string tenantId, string requestedPlanId, int months, string? reason, string requestedBy);

        // Center: Xem yêu cầu của mình
        Task<List<PackageChangeRequest>> GetTenantPackageChangeRequestsAsync(string tenantId);

        // SystemAdmin: Xem tất cả yêu cầu
        Task<List<PackageChangeRequest>> GetAllPackageChangeRequestsAsync(string? status = null);

        // SystemAdmin: Duyệt/Từ chối yêu cầu
        Task<PackageChangeRequest> ReviewPackageChangeRequestAsync(string requestId, bool approved, string? reviewNote, string reviewedBy);

        // SystemAdmin: Tạo hoá đơn sau khi duyệt
        Task<Invoice> CreateInvoiceAsync(string requestId, int dueDays, string createdBy);

        // SystemAdmin: Lấy hoá đơn theo tenant
        Task<List<Invoice>> GetInvoicesByTenantAsync(string tenantId);
        Task<List<Invoice>> GetAllInvoicesAsync(string? tenantId = null, string? status = null);

        // SystemAdmin: Cập nhật trạng thái thanh toán
        Task<Invoice> UpdateInvoicePaymentAsync(string invoiceId, string paymentMethod, string? paymentNote, string updatedBy);
        Task<Invoice> ConfirmInvoicePaidAndApplyAsync(
            string invoiceId,
            string paymentMethod,
            string? paymentNote,
            string updatedBy,
            string? existingPaymentRecordId = null);

        // Center: Gửi yêu cầu xác nhận thanh toán offline (tiền mặt/chuyển khoản)
        Task<Invoice> RequestOfflineInvoicePaymentAsync(string tenantId, string invoiceId, string paymentMethod, string? paymentNote, string requestedBy);
    }

    public class SubscriptionChangeService : ISubscriptionChangeService
    {
        private readonly AdminDbContext _context;
        private readonly IConfiguration _configuration;
        private const int GracePeriodDays = 7;
        private const int MinInvoiceDueDays = 1;
        private const int MaxInvoiceDueDays = 60;

        public SubscriptionChangeService(AdminDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<PackageChangeRequest> CreatePackageChangeRequestAsync(string tenantId, string requestedPlanId, int months, string? reason, string requestedBy)
        {
            if (months < 1 || months > 120)
                throw new Exception("So thang dang ky phai tu 1 den 120.");

            var tenant = await _context.Tenants
                .Include(t => t.Subscriptions.Where(s => s.Status == "Active"))
                .FirstOrDefaultAsync(t => t.TenantId == tenantId);

            if (tenant == null)
                throw new Exception("Không tìm thấy trung tâm.");

            var requestedPlan = await _context.Plans.FindAsync(requestedPlanId);
            if (requestedPlan == null || !requestedPlan.IsActive)
                throw new Exception("Gói dịch vụ không hợp lệ.");

            var currentSubscription = tenant.Subscriptions?.FirstOrDefault();
            ValidateChangeRules(currentSubscription, requestedPlan);
            var currentPlanId = currentSubscription?.PlanId ?? "";

            // Kiểm tra yêu cầu đổi gói đang chờ
            var pendingRequest = await _context.PackageChangeRequests
                .AnyAsync(r => r.TenantId == tenantId && r.Status == "Pending");

            if (pendingRequest)
                throw new Exception("Đã có yêu cầu đổi gói đang chờ xử lý.");

            var request = new PackageChangeRequest
            {
                TenantId = tenantId,
                CurrentPlanId = currentPlanId,
                RequestedPlanId = requestedPlanId,
                RequestedMonths = months,
                Reason = reason?.Trim(),
                Status = "Pending",
                RequestedAt = DateTime.UtcNow,
                RequestedBy = requestedBy
            };

            _context.PackageChangeRequests.Add(request);
            await _context.SaveChangesAsync();

            return request;
        }

        public async Task<List<PackageChangeRequest>> GetTenantPackageChangeRequestsAsync(string tenantId)
        {
            return await _context.PackageChangeRequests
                .Include(r => r.CurrentPlan)
                .Include(r => r.RequestedPlan)
                .Where(r => r.TenantId == tenantId)
                .OrderByDescending(r => r.RequestedAt)
                .ToListAsync();
        }

        public async Task<List<PackageChangeRequest>> GetAllPackageChangeRequestsAsync(string? status = null)
        {
            var query = _context.PackageChangeRequests
                .Include(r => r.Tenant)
                .Include(r => r.CurrentPlan)
                .Include(r => r.RequestedPlan)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
                query = query.Where(r => r.Status == status);

            return await query
                .OrderByDescending(r => r.RequestedAt)
                .ToListAsync();
        }

        public async Task<PackageChangeRequest> ReviewPackageChangeRequestAsync(string requestId, bool approved, string? reviewNote, string reviewedBy)
        {
            var request = await _context.PackageChangeRequests
                .Include(r => r.Tenant)
                .Include(r => r.RequestedPlan)
                .FirstOrDefaultAsync(r => r.RequestId == requestId);

            if (request == null)
                throw new Exception("Không tìm thấy yêu cầu.");

            if (request.Status != "Pending")
                throw new Exception("Yêu cầu đã được xử lý.");

            request.Status = approved ? "Approved" : "Rejected";
            request.ReviewedAt = DateTime.UtcNow;
            request.ReviewedBy = reviewedBy;
            request.ReviewNote = reviewNote?.Trim();

            await _context.SaveChangesAsync();

            if (approved)
            {
                // Auto gửi hóa đơn ngay sau khi duyệt, dùng cấu hình hạn đóng tiền mặc định.
                await CreateInvoiceAsync(requestId, 0, reviewedBy);
            }

            return request;
        }

        public async Task<Invoice> CreateInvoiceAsync(string requestId, int dueDays, string createdBy)
        {
            var effectiveDueDays = ResolveDueDays(dueDays);

            var request = await _context.PackageChangeRequests
                .Include(r => r.Tenant)
                .Include(r => r.RequestedPlan)
                .FirstOrDefaultAsync(r => r.RequestId == requestId);

            if (request == null)
                throw new Exception("Không tìm thấy yêu cầu.");

            if (request.Status != "Approved")
                throw new Exception("Yêu cầu phải được duyệt trước khi tạo hoá đơn.");

            var now = DateTime.UtcNow;
            var existingInvoices = await _context.Invoices
                .Where(i => i.PackageChangeRequestId == requestId)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            var paidInvoice = existingInvoices.FirstOrDefault(i => i.Status == "Paid");
            if (paidInvoice != null)
                throw new Exception("Yeu cau nay da co hoa don da thanh toan.");

            foreach (var invoiceItem in existingInvoices.Where(i => i.Status == "Pending" || i.Status == "AwaitingConfirmation"))
            {
                if (invoiceItem.DueDate < now)
                {
                    invoiceItem.Status = "Expired";
                    var expiredNote = $"Invoice expired at {now:O}";
                    invoiceItem.PaymentNote = string.IsNullOrWhiteSpace(invoiceItem.PaymentNote)
                        ? expiredNote
                        : (invoiceItem.PaymentNote.Length + expiredNote.Length + 3 > 200 
                            ? invoiceItem.PaymentNote[..200] 
                            : $"{invoiceItem.PaymentNote} | {expiredNote}");
                }
            }

            var blockingInvoice = existingInvoices.FirstOrDefault(i =>
                i.Status == "Pending" || i.Status == "AwaitingConfirmation");
            if (blockingInvoice != null)
                throw new Exception("Yeu cau nay da co hoa don chua het han. Chi duoc tao lai khi hoa don cu da het han.");

            var activeSubscription = await GetActiveSubscriptionAsync(request.TenantId);
            ValidateChangeRules(activeSubscription, request.RequestedPlan);

            var pricing = CalculateChangePricing(
                request.RequestedPlan,
                request.RequestedMonths,
                request.Tenant.CreditBalance,
                activeSubscription);

            var invoice = new Invoice
            {
                TenantId = request.TenantId,
                PackageChangeRequestId = requestId,
                InvoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6]}",
                Amount = pricing.AmountToCharge,
                Status = "Pending",
                PaymentMethod = "Cash", // Default, will be updated on payment
                DueDate = now.AddDays(effectiveDueDays),
                CreatedAt = DateTime.UtcNow,
                CreatedBy = createdBy,
                PaymentNote = $"Goi: {request.RequestedPlan.PlanName} | {request.RequestedMonths} thang | Gia goc: {pricing.TotalAmount:N0} VND | {BuildPricingNote(pricing)}"
            };

            _context.Invoices.Add(invoice);

            await _context.SaveChangesAsync();
            return invoice;
        }

        public async Task<List<Invoice>> GetInvoicesByTenantAsync(string tenantId)
        {
            return await _context.Invoices
                .Include(i => i.PackageChangeRequest)
                .ThenInclude(pcr => pcr.RequestedPlan)
                .Where(i => i.TenantId == tenantId)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<Invoice>> GetAllInvoicesAsync(string? tenantId = null, string? status = null)
        {
            var query = _context.Invoices
                .Include(i => i.Tenant)
                .Include(i => i.PackageChangeRequest)
                .ThenInclude(pcr => pcr.RequestedPlan)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(tenantId))
                query = query.Where(i => i.TenantId == tenantId);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(i => i.Status == status);

            return await query
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();
        }

        public async Task<Invoice> UpdateInvoicePaymentAsync(string invoiceId, string paymentMethod, string? paymentNote, string updatedBy)
        {
            return await ConfirmInvoicePaidAndApplyAsync(invoiceId, paymentMethod, paymentNote, updatedBy);
        }

        public async Task<Invoice> ConfirmInvoicePaidAndApplyAsync(
            string invoiceId,
            string paymentMethod,
            string? paymentNote,
            string updatedBy,
            string? existingPaymentRecordId = null)
        {
            var invoice = await _context.Invoices
                .Include(i => i.PackageChangeRequest)
                .ThenInclude(pcr => pcr.RequestedPlan)
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);

            if (invoice == null)
                throw new Exception("Không tìm thấy hoá đơn.");

            if (invoice.Status == "Paid")
                throw new Exception("Hoa don da thanh toan.");

            if (invoice.Status == "Cancelled")
                throw new Exception("Hoa don da bi huy.");

            if (invoice.DueDate < DateTime.UtcNow)
            {
                invoice.Status = "Expired";
                await _context.SaveChangesAsync();
                throw new Exception("Hoa don da het han thanh toan.");
            }

            ValidatePaymentMethod(paymentMethod);

            if (invoice.Status != "Paid")
            {
                invoice.PaymentMethod = paymentMethod;
                if (!string.IsNullOrWhiteSpace(paymentNote))
                {
                    // Truncate to 200 chars to match database column max length
                    invoice.PaymentNote = paymentNote.Trim().Length > 200 
                        ? paymentNote.Trim()[..200] 
                        : paymentNote.Trim();
                }
                invoice.Status = "Paid";
                invoice.PaidAt = DateTime.UtcNow;
            }

            var paymentRecordId = existingPaymentRecordId;
            if (string.IsNullOrWhiteSpace(paymentRecordId))
            {
                var paymentRecord = new PaymentRecord
                {
                    TenantId = invoice.TenantId,
                    Amount = invoice.Amount,
                    Status = "Paid",
                    PaymentDate = DateTime.UtcNow,
                    TransactionType = "SubscriptionInvoice",
                    ReferenceId = invoice.InvoiceId,
                    PaymentMethod = paymentMethod,
                    Description = $"Thanh toan hoa don {invoice.InvoiceNumber}"
                };
                _context.PaymentRecords.Add(paymentRecord);
                paymentRecordId = paymentRecord.PaymentId;
            }

            await ApplyPackageChangeForPaidInvoiceAsync(invoice, paymentMethod, updatedBy, paymentRecordId!);
            await _context.SaveChangesAsync();
            return invoice;
        }

        public async Task<Invoice> RequestOfflineInvoicePaymentAsync(string tenantId, string invoiceId, string paymentMethod, string? paymentNote, string requestedBy)
        {
            var normalizedMethod = paymentMethod?.Trim();
            if (!string.Equals(normalizedMethod, "Cash", StringComparison.OrdinalIgnoreCase))
            {
                throw new Exception("Phuong thuc thanh toan khong hop le. Chi ho tro thanh toan Tien mat.");
            }

            var invoice = await _context.Invoices
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId && i.TenantId == tenantId);

            if (invoice == null)
                throw new Exception("Không tìm thấy hoá đơn.");

            if (invoice.Status == "Paid")
                throw new Exception("Hoá đơn đã thanh toán.");

            if (invoice.Status == "Cancelled")
                throw new Exception("Hoá đơn đã bị huỷ.");

            if (invoice.DueDate < DateTime.UtcNow)
            {
                invoice.Status = "Expired";
                await _context.SaveChangesAsync();
                throw new Exception("Hoa don da het han thanh toan.");
            }

            invoice.PaymentMethod = normalizedMethod!;
            invoice.PaymentNote = string.IsNullOrWhiteSpace(paymentNote)
                ? $"Center gửi yêu cầu xác nhận thanh toán {normalizedMethod}. Người gửi: {requestedBy}"
                : paymentNote.Trim();
            invoice.Status = "AwaitingConfirmation";

            await _context.SaveChangesAsync();
            return invoice;
        }

        private async Task<Subscription?> GetActiveSubscriptionAsync(string tenantId)
        {
            return await _context.Subscriptions
                .Include(s => s.Plan)
                .Where(s => s.TenantId == tenantId && s.Status == "Active" && s.EndDate > DateTime.UtcNow)
                .OrderByDescending(s => s.EndDate)
                .FirstOrDefaultAsync();
        }

        private static void ValidatePaymentMethod(string paymentMethod)
        {
            if (string.Equals(paymentMethod, "Cash", StringComparison.OrdinalIgnoreCase)) return;
            if (string.Equals(paymentMethod, "VNPay", StringComparison.OrdinalIgnoreCase)) return;
            if (string.Equals(paymentMethod, "Credit", StringComparison.OrdinalIgnoreCase)) return;

            throw new Exception("Phuong thuc thanh toan khong hop le.");
        }

        private static void ValidateChangeRules(Subscription? currentSub, Plan requestedPlan)
        {
            if (currentSub?.Plan == null)
                return;

            var isDowngrade = requestedPlan.Price < currentSub.Plan.Price;
            if (!isDowngrade)
                return;

            var daysSinceStart = (DateTime.UtcNow - currentSub.StartDate).Days;
            if (daysSinceStart > GracePeriodDays)
                throw new Exception("Chi duoc ha goi trong 7 ngay dau tien cua goi hien tai.");
        }

        private static decimal CalculateDowngradeCredit(Subscription? currentSub, Plan requestedPlan)
        {
            if (currentSub?.Plan == null)
                return 0;

            if (requestedPlan.Price >= currentSub.Plan.Price)
                return 0;

            var daysSinceStart = (DateTime.UtcNow - currentSub.StartDate).Days;
            if (daysSinceStart > GracePeriodDays)
                return 0;

            var totalDays = (currentSub.EndDate - currentSub.StartDate).Days;
            if (totalDays <= 0)
                return 0;

            var remainingDays = Math.Max(0, (currentSub.EndDate - DateTime.UtcNow).Days);
            if (remainingDays <= 0)
                return 0;

            var priceDiff = currentSub.Plan.Price - requestedPlan.Price;
            var prorated = priceDiff * remainingDays / totalDays;
            return Math.Round(prorated, 0, MidpointRounding.AwayFromZero);
        }

        private static ChangePricingResult CalculateChangePricing(
            Plan requestedPlan,
            int months,
            decimal currentCreditBalance,
            Subscription? currentSub)
        {
            var totalAmount = requestedPlan.Price * months;
            var refundCredit = CalculateDowngradeCredit(currentSub, requestedPlan);
            var creditAvailable = Math.Max(0, currentCreditBalance) + refundCredit;
            var creditUsed = Math.Min(totalAmount, creditAvailable);
            var amountToCharge = Math.Round(totalAmount - creditUsed, 0, MidpointRounding.AwayFromZero);

            return new ChangePricingResult
            {
                TotalAmount = totalAmount,
                RefundCredit = refundCredit,
                CreditUsed = creditUsed,
                AmountToCharge = amountToCharge
            };
        }

        private static string BuildPricingNote(ChangePricingResult pricing)
        {
            return $"Pricing: total={pricing.TotalAmount}; refundCredit={pricing.RefundCredit}; creditUsed={pricing.CreditUsed}; amountToCharge={pricing.AmountToCharge}";
        }

        private int ResolveDueDays(int requestedDueDays)
        {
            if (requestedDueDays >= MinInvoiceDueDays && requestedDueDays <= MaxInvoiceDueDays)
                return requestedDueDays;

            var configuredDefault = _configuration.GetValue<int?>("SubscriptionInvoices:DefaultDueDays") ?? 7;
            if (configuredDefault < MinInvoiceDueDays) configuredDefault = MinInvoiceDueDays;
            if (configuredDefault > MaxInvoiceDueDays) configuredDefault = MaxInvoiceDueDays;

            return configuredDefault;
        }

        private static bool AmountEquals(decimal left, decimal right)
        {
            return Math.Abs(left - right) <= 0.01m;
        }

        private async Task ApplyPackageChangeForPaidInvoiceAsync(
            Invoice invoice,
            string paymentMethod,
            string updatedBy,
            string paymentRecordId)
        {
            var request = await _context.PackageChangeRequests
                .Include(r => r.RequestedPlan)
                .FirstOrDefaultAsync(r => r.RequestId == invoice.PackageChangeRequestId);

            if (request == null)
                throw new Exception("Khong tim thay yeu cau doi goi.");

            if (request.Status == "Completed")
                return;

            var tenant = await _context.Tenants.FindAsync(request.TenantId);
            if (tenant == null)
                throw new Exception("Khong tim thay trung tam.");

            var currentSub = await GetActiveSubscriptionAsync(request.TenantId);
            ValidateChangeRules(currentSub, request.RequestedPlan);

            var pricing = CalculateChangePricing(
                request.RequestedPlan,
                request.RequestedMonths,
                tenant.CreditBalance,
                currentSub);

            if (!AmountEquals(pricing.AmountToCharge, invoice.Amount))
                throw new Exception("Hoa don khong con khop voi cong thuc bu tru credit hien tai.");

            // Khi thanh toán bằng tiền mặt/VNPay: Cộng credit = giá gốc (totalAmount)
            // Credit tượng trưng cho giá tiền của gói đăng ký
                        if (pricing.RefundCredit > 0)
            {
                tenant.CreditBalance += pricing.RefundCredit;
                _context.TenantCreditLedgers.Add(new TenantCreditLedger
                {
                    TenantId = tenant.TenantId,
                    Amount = pricing.RefundCredit,
                    EntryType = "Credit",
                    ReferenceType = "DowngradeRefund",
                    ReferenceId = request.RequestId,
                    BalanceAfter = tenant.CreditBalance,
                    Note = "Hoàn credit khi hạ gói trong grace period"
                });
            }

            if (pricing.CreditUsed > 0)
            {
                tenant.CreditBalance -= pricing.CreditUsed;
                _context.TenantCreditLedgers.Add(new TenantCreditLedger
                {
                    TenantId = tenant.TenantId,
                    Amount = -pricing.CreditUsed,
                    EntryType = "Debit",
                    ReferenceType = "PackageChangeUseCredit",
                    ReferenceId = request.RequestId,
                    BalanceAfter = tenant.CreditBalance,
                    Note = "Sử dụng credit bù trừ khi đổi gói"
                });
            }
            if (pricing.TotalAmount > 0)
            {
                tenant.CreditBalance += pricing.TotalAmount;
                _context.TenantCreditLedgers.Add(new TenantCreditLedger
                {
                    TenantId = tenant.TenantId,
                    Amount = pricing.TotalAmount,
                    EntryType = "Credit",
                    ReferenceType = "PackageChangePayment",
                    ReferenceId = request.RequestId,
                    BalanceAfter = tenant.CreditBalance,
                    Note = "Nạp credit khi thanh toán đổi gói bằng tiền mặt/VNPay"
                });
            }

            var now = DateTime.UtcNow;
            if (currentSub == null)
            {
                _context.Subscriptions.Add(new Subscription
                {
                    TenantId = tenant.TenantId,
                    PlanId = request.RequestedPlanId,
                    StartDate = now,
                    EndDate = now.AddMonths(request.RequestedMonths),
                    Status = "Active"
                });
            }
            else if (currentSub.PlanId == request.RequestedPlanId)
            {
                var baseDate = currentSub.EndDate > now ? currentSub.EndDate : now;
                currentSub.EndDate = baseDate.AddMonths(request.RequestedMonths);
                currentSub.Status = "Active";
            }
            else
            {
                currentSub.Status = "Cancelled";
                currentSub.EndDate = now;

                _context.Subscriptions.Add(new Subscription
                {
                    TenantId = tenant.TenantId,
                    PlanId = request.RequestedPlanId,
                    StartDate = now,
                    EndDate = now.AddMonths(request.RequestedMonths),
                    Status = "Active"
                });
            }

            request.Status = "Completed";
            request.ReviewedAt ??= DateTime.UtcNow;
            request.ReviewedBy ??= updatedBy;
            request.ReviewNote = string.IsNullOrWhiteSpace(request.ReviewNote)
                ? $"Applied by {updatedBy}"
                : $"{request.ReviewNote} | Applied by {updatedBy}";

            var applyNote = $"Package change applied. paymentMethod={paymentMethod}; paymentRecordId={paymentRecordId}; appliedAt={now:O}";
            var newNote = string.IsNullOrWhiteSpace(invoice.PaymentNote)
                ? applyNote
                : $"{invoice.PaymentNote} | {applyNote}";
            // Truncate to 200 chars to match database column max length
            invoice.PaymentNote = newNote.Length > 200 ? newNote[..200] : newNote;
        }

        private sealed class ChangePricingResult
        {
            public decimal TotalAmount { get; set; }
            public decimal RefundCredit { get; set; }
            public decimal CreditUsed { get; set; }
            public decimal AmountToCharge { get; set; }
        }
    }
}




