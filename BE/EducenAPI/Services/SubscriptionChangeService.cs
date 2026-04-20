using EducenAPI.Models;
using EducenAPI.DTOs.Subscription;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
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
        Task<List<SubscriptionInvoiceListItemDto>> GetInvoicesByTenantAsync(string tenantId);
        Task<List<SubscriptionInvoiceListItemDto>> GetAllInvoicesAsync(string? tenantId = null, string? status = null, int page = 1, int pageSize = 100);
        Task<int> CountAllInvoicesAsync(string? tenantId = null, string? status = null);

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
        private readonly MailService _mailService;
        private readonly IEInvoiceSandboxService _eInvoiceSandboxService;
        private readonly ILogger<SubscriptionChangeService> _logger;
        private const int GracePeriodDays = 7;
        private const int MinInvoiceDueDays = 1;
        private const int MaxInvoiceDueDays = 60;

        public SubscriptionChangeService(
            AdminDbContext context,
            IConfiguration configuration,
            MailService mailService,
            IEInvoiceSandboxService eInvoiceSandboxService,
            ILogger<SubscriptionChangeService> logger)
        {
            _context = context;
            _configuration = configuration;
            _mailService = mailService;
            _eInvoiceSandboxService = eInvoiceSandboxService;
            _logger = logger;
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

            var currentSubscription = await GetActiveSubscriptionAsync(tenantId);
            ValidateChangeRules(currentSubscription, requestedPlan);

            // CurrentPlanId has FK to Plans, so it must always reference an existing Plan.
            // Fallback to requested plan when tenant has no active/valid current plan.
            var currentPlanId = currentSubscription?.PlanId;
            var hasCurrentPlan = !string.IsNullOrWhiteSpace(currentPlanId) &&
                                 await _context.Plans.AnyAsync(p => p.PlanId == currentPlanId);
            if (!hasCurrentPlan)
            {
                currentPlanId = requestedPlanId;
            }

            // Kiểm tra yêu cầu đổi gói đang chờ
            var pendingRequest = await _context.PackageChangeRequests
                .AnyAsync(r => r.TenantId == tenantId && r.Status == "Pending");

            if (pendingRequest)
                throw new Exception("Đã có yêu cầu đổi gói đang chờ xử lý.");

            var request = new PackageChangeRequest
            {
                TenantId = tenantId,
                CurrentPlanId = currentPlanId!,
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
            CreateCenterReviewNotification(request, approved, reviewedBy);

            await _context.SaveChangesAsync();
            _ = TrySendPackageChangeReviewEmailAsync(request, approved, reviewedBy);

            if (approved)
            {
                // Auto gửi hóa đơn ngay sau khi duyệt, dùng cấu hình hạn đóng tiền mặc định.
                await CreateInvoiceAsync(requestId, 0, reviewedBy);
            }

            return request;
        }

        private void CreateCenterReviewNotification(PackageChangeRequest request, bool approved, string reviewedBy)
        {
            var reason = string.IsNullOrWhiteSpace(request.ReviewNote) ? "Khong co ly do." : request.ReviewNote.Trim();
            if (reason.Length > 700)
            {
                reason = reason[..700];
            }

            var title = approved
                ? "Yeu cau doi goi da duoc duyet"
                : "Yeu cau doi goi da bi tu choi";

            var message = approved
                ? $"Yeu cau doi sang goi '{request.RequestedPlan?.PlanName ?? request.RequestedPlanId}' da duoc duyet boi {reviewedBy}. He thong se tao hoa don."
                : $"Yeu cau doi sang goi '{request.RequestedPlan?.PlanName ?? request.RequestedPlanId}' da bi tu choi boi {reviewedBy}. Ly do: {reason}";

            var now = DateTime.UtcNow;
            _context.PaymentNotifications.Add(new PaymentNotification
            {
                TenantId = request.TenantId,
                NotificationType = "PackageChangeReview",
                Title = title,
                Message = message.Length > 1000 ? message[..1000] : message,
                Channel = "InApp",
                Status = "Sent",
                ScheduledFor = now,
                SentAt = now,
                CreatedAt = now
            });
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
                throw new Exception("Yêu cầu này đã có hóa đơn đã thanh toán.");

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
                throw new Exception("Yêu cầu này đã có hóa đơn chưa hết hạn. Chỉ được tạo lại khi hóa đơn cũ đã hết hạn.");

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
                Status = pricing.AmountToCharge <= 0 ? "Paid" : "Pending",
                PaymentMethod = pricing.AmountToCharge <= 0 ? "Credit" : "Cash",
                DueDate = now.AddDays(effectiveDueDays),
                CreatedAt = DateTime.UtcNow,
                CreatedBy = createdBy,
                PaidAt = pricing.AmountToCharge <= 0 ? now : null,
                PaymentNote = $"Goi: {request.RequestedPlan.PlanName} | {request.RequestedMonths} thang | Gia goi: {pricing.TotalAmount:N0} VND | {BuildPricingNote(pricing)}"
            };

            _context.Invoices.Add(invoice);

            if (pricing.AmountToCharge <= 0)
            {
                await ApplyPackageChangeForPaidInvoiceAsync(invoice, "Credit", createdBy, "SYSTEM-AUTO-CREDIT");
            }

            await _context.SaveChangesAsync();
            return invoice;
        }

        public async Task<List<SubscriptionInvoiceListItemDto>> GetInvoicesByTenantAsync(string tenantId)
        {
            return await _context.Invoices
                .AsNoTracking()
                .Where(i => i.TenantId == tenantId)
                .Select(i => new SubscriptionInvoiceListItemDto
                {
                    InvoiceId = i.InvoiceId,
                    TenantId = i.TenantId,
                    PackageChangeRequestId = i.PackageChangeRequestId,
                    InvoiceNumber = i.InvoiceNumber,
                    Amount = i.Amount,
                    Status = i.Status,
                    PaymentMethod = i.PaymentMethod,
                    PaymentNote = i.PaymentNote,
                    DueDate = i.DueDate,
                    CreatedAt = i.CreatedAt,
                    CreatedBy = i.CreatedBy,
                    PaidAt = i.PaidAt,
                    PackageChangeRequest = i.PackageChangeRequest == null ? null : new SubscriptionInvoiceRequestDto
                    {
                        RequestId = i.PackageChangeRequest.RequestId,
                        CurrentPlanId = i.PackageChangeRequest.CurrentPlanId,
                        RequestedPlanId = i.PackageChangeRequest.RequestedPlanId,
                        RequestedMonths = i.PackageChangeRequest.RequestedMonths,
                        Status = i.PackageChangeRequest.Status,
                        Reason = i.PackageChangeRequest.Reason,
                        ReviewNote = i.PackageChangeRequest.ReviewNote,
                        RequestedAt = i.PackageChangeRequest.RequestedAt,
                        ReviewedAt = i.PackageChangeRequest.ReviewedAt,
                        RequestedBy = i.PackageChangeRequest.RequestedBy,
                        ReviewedBy = i.PackageChangeRequest.ReviewedBy,
                        RequestedPlan = i.PackageChangeRequest.RequestedPlan == null ? null : new SubscriptionInvoicePlanDto
                        {
                            PlanId = i.PackageChangeRequest.RequestedPlan.PlanId,
                            PlanName = i.PackageChangeRequest.RequestedPlan.PlanName,
                            Price = i.PackageChangeRequest.RequestedPlan.Price,
                            IsTrial = i.PackageChangeRequest.RequestedPlan.IsTrial
                        }
                    }
                })
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<SubscriptionInvoiceListItemDto>> GetAllInvoicesAsync(string? tenantId = null, string? status = null, int page = 1, int pageSize = 100)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 1 : (pageSize > 200 ? 200 : pageSize);

            var query = _context.Invoices
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(tenantId))
                query = query.Where(i => i.TenantId == tenantId);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(i => i.Status == status);

            return await query
                .OrderByDescending(i => i.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(i => new SubscriptionInvoiceListItemDto
                {
                    InvoiceId = i.InvoiceId,
                    TenantId = i.TenantId,
                    PackageChangeRequestId = i.PackageChangeRequestId,
                    InvoiceNumber = i.InvoiceNumber,
                    Amount = i.Amount,
                    Status = i.Status,
                    PaymentMethod = i.PaymentMethod,
                    PaymentNote = i.PaymentNote,
                    DueDate = i.DueDate,
                    CreatedAt = i.CreatedAt,
                    CreatedBy = i.CreatedBy,
                    PaidAt = i.PaidAt,
                    Tenant = i.Tenant == null ? null : new SubscriptionInvoiceTenantDto
                    {
                        TenantId = i.Tenant.TenantId,
                        TenantName = i.Tenant.TenantName,
                        Email = i.Tenant.Email,
                        PhoneNumber = i.Tenant.PhoneNumber,
                        ContactPerson = i.Tenant.ContactPerson
                    },
                    PackageChangeRequest = i.PackageChangeRequest == null ? null : new SubscriptionInvoiceRequestDto
                    {
                        RequestId = i.PackageChangeRequest.RequestId,
                        CurrentPlanId = i.PackageChangeRequest.CurrentPlanId,
                        RequestedPlanId = i.PackageChangeRequest.RequestedPlanId,
                        RequestedMonths = i.PackageChangeRequest.RequestedMonths,
                        Status = i.PackageChangeRequest.Status,
                        Reason = i.PackageChangeRequest.Reason,
                        ReviewNote = i.PackageChangeRequest.ReviewNote,
                        RequestedAt = i.PackageChangeRequest.RequestedAt,
                        ReviewedAt = i.PackageChangeRequest.ReviewedAt,
                        RequestedBy = i.PackageChangeRequest.RequestedBy,
                        ReviewedBy = i.PackageChangeRequest.ReviewedBy,
                        RequestedPlan = i.PackageChangeRequest.RequestedPlan == null ? null : new SubscriptionInvoicePlanDto
                        {
                            PlanId = i.PackageChangeRequest.RequestedPlan.PlanId,
                            PlanName = i.PackageChangeRequest.RequestedPlan.PlanName,
                            Price = i.PackageChangeRequest.RequestedPlan.Price,
                            IsTrial = i.PackageChangeRequest.RequestedPlan.IsTrial
                        }
                    }
                })
                .ToListAsync();
        }

        public async Task<int> CountAllInvoicesAsync(string? tenantId = null, string? status = null)
        {
            var query = _context.Invoices
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(tenantId))
                query = query.Where(i => i.TenantId == tenantId);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(i => i.Status == status);

            return await query.CountAsync();
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
                throw new Exception("Không tìm thấy hóa đơn.");

            if (invoice.Status == "Paid")
                throw new Exception("Hóa đơn đã thanh toán.");

            if (invoice.Status == "Cancelled")
                throw new Exception("Hóa đơn đã bị hủy.");

            if (invoice.DueDate < DateTime.UtcNow)
            {
                invoice.Status = "Expired";
                await _context.SaveChangesAsync();
                throw new Exception("Hóa đơn đã hết hạn thanh toán.");
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
            await TrySendSubscriptionEInvoiceEmailAsync(invoice, updatedBy, paymentRecordId);
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
                throw new Exception("Không tìm thấy hóa đơn.");

            if (invoice.Status == "Paid")
                throw new Exception("Hoá đơn đã thanh toán.");

            if (invoice.Status == "Cancelled")
                throw new Exception("Hoá đơn đã bị huỷ.");

            if (invoice.DueDate < DateTime.UtcNow)
            {
                invoice.Status = "Expired";
                await _context.SaveChangesAsync();
                throw new Exception("Hóa đơn đã hết hạn thanh toán.");
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
            return 0;
        }

        private static ChangePricingResult CalculateChangePricing(
            Plan requestedPlan,
            int months,
            decimal currentCreditBalance,
            Subscription? _currentSub)
        {
            var totalAmount = requestedPlan.Price * months;
            var creditAvailable = Math.Max(0, currentCreditBalance);
            var creditShortage = Math.Max(0, totalAmount - creditAvailable);
            var amountToCharge = Math.Round(creditShortage, 0, MidpointRounding.AwayFromZero);

            return new ChangePricingResult
            {
                TotalAmount = totalAmount,
                CurrentCredit = creditAvailable,
                AmountToCharge = amountToCharge
            };
        }

        private static string BuildPricingNote(ChangePricingResult pricing)
        {
            return $"Pricing: total={pricing.TotalAmount}; currentCredit={pricing.CurrentCredit}; amountToCharge={pricing.AmountToCharge}";
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
                throw new Exception("Không tìm thấy yêu cầu đổi gói.");

            if (request.Status == "Completed")
                return;

            var tenant = await _context.Tenants.FindAsync(request.TenantId);
            if (tenant == null)
                throw new Exception("Không tìm thấy trung tâm.");

            var currentSub = await GetActiveSubscriptionAsync(request.TenantId);
            ValidateChangeRules(currentSub, request.RequestedPlan);

            var pricing = CalculateChangePricing(
                request.RequestedPlan,
                request.RequestedMonths,
                tenant.CreditBalance,
                currentSub);

            if (!AmountEquals(pricing.AmountToCharge, invoice.Amount))
                throw new Exception("Hóa đơn không còn khớp với công thức bù trừ credit hiện tại.");

            if (invoice.Amount > 0 &&
                (string.Equals(paymentMethod, "Cash", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(paymentMethod, "VNPay", StringComparison.OrdinalIgnoreCase)))
            {
                tenant.CreditBalance += invoice.Amount;
                _context.TenantCreditLedgers.Add(new TenantCreditLedger
                {
                    TenantId = tenant.TenantId,
                    Amount = invoice.Amount,
                    EntryType = "Credit",
                    ReferenceType = "PackageChangePayment",
                    ReferenceId = request.RequestId,
                    BalanceAfter = tenant.CreditBalance,
                    Note = "Nap credit khi thanh toan doi goi bang tien mat/VNPay"
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
            public decimal CurrentCredit { get; set; }
            public decimal AmountToCharge { get; set; }
        }

        private async Task TrySendSubscriptionEInvoiceEmailAsync(Invoice invoice, string updatedBy, string? paymentRecordId)
        {
            try
            {
                var tenant = await _context.Tenants
                    .AsNoTracking()
                    .FirstOrDefaultAsync(t => t.TenantId == invoice.TenantId);
                if (tenant == null) return;

                var recipientEmail = await ResolveSubscriptionPayerEmailAsync(invoice.TenantId, paymentRecordId)
                    ?? (!string.IsNullOrWhiteSpace(updatedBy) && updatedBy.Contains("@") ? updatedBy.Trim() : null)
                    ?? tenant.Email;
                if (string.IsNullOrWhiteSpace(recipientEmail)) return;

                var tenantName = tenant.TenantName ?? "Center";
                var meta = _eInvoiceSandboxService.BuildMetadata(invoice, tenantName);
                var xml = _eInvoiceSandboxService.BuildXml(invoice, tenantName, meta);
                var html = _eInvoiceSandboxService.BuildHtmlRepresentation(invoice, tenantName, meta);
                var pdf = _eInvoiceSandboxService.BuildPdfRepresentation(invoice, tenantName, meta);

                _logger.LogInformation(
                    "Sending subscription e-invoice email. InvoiceId={InvoiceId}, PaymentRecordId={PaymentRecordId}, Recipient={RecipientEmail}",
                    invoice.InvoiceId,
                    paymentRecordId,
                    recipientEmail);

                await _mailService.SendEmailWithAttachmentsAsync(
                    recipientEmail,
                    "Xac nhan thanh toan hoa don doi goi - Kem hoa don dien tu (Sandbox)",
                    $"<p>Hoa don doi goi da duoc thanh toan thanh cong.</p><p>Ma hoa don: <strong>{invoice.InvoiceNumber}</strong></p>",
                    new[]
                    {
                        ($"{meta.InvoiceNo}.xml", "application/xml", System.Text.Encoding.UTF8.GetBytes(xml)),
                        ($"{meta.InvoiceNo}.html", "text/html", System.Text.Encoding.UTF8.GetBytes(html)),
                        ($"{meta.InvoiceNo}.pdf", "application/pdf", pdf)
                    });

                _logger.LogInformation(
                    "Sent subscription e-invoice email successfully. InvoiceId={InvoiceId}, Recipient={RecipientEmail}",
                    invoice.InvoiceId,
                    recipientEmail);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send subscription e-invoice email for {InvoiceId}", invoice.InvoiceId);
            }
        }

        private async Task<string?> ResolveSubscriptionPayerEmailAsync(string tenantId, string? paymentRecordId)
        {
            if (string.IsNullOrWhiteSpace(paymentRecordId))
            {
                return null;
            }

            var paymentRecord = await _context.PaymentRecords
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.PaymentId == paymentRecordId);
            if (paymentRecord == null || string.IsNullOrWhiteSpace(paymentRecord.PaidBy))
            {
                return null;
            }

            var paidBy = paymentRecord.PaidBy.Trim();
            if (paidBy.Contains("@"))
            {
                return paidBy;
            }

            var tenant = await _context.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TenantId == tenantId);
            if (tenant != null && string.Equals(tenant.Username, paidBy, StringComparison.OrdinalIgnoreCase))
            {
                return tenant.Email;
            }

            return null;
        }

        private async Task TrySendPackageChangeReviewEmailAsync(
            PackageChangeRequest request,
            bool approved,
            string reviewedBy)
        {
            try
            {
                var recipientEmail = request.Tenant?.Email?.Trim();
                if (string.IsNullOrWhiteSpace(recipientEmail))
                {
                    return;
                }

                var tenantName = request.Tenant?.TenantName ?? "Center";
                var planName = request.RequestedPlan?.PlanName ?? request.RequestedPlanId;
                var reviewedAt = request.ReviewedAt ?? DateTime.UtcNow;
                var subject = approved
                    ? "Yeu cau doi goi da duoc duyet"
                    : "Yeu cau doi goi da bi tu choi";
                var safeReviewedBy = System.Net.WebUtility.HtmlEncode(reviewedBy);
                var safeTenantName = System.Net.WebUtility.HtmlEncode(tenantName);
                var safePlanName = System.Net.WebUtility.HtmlEncode(planName);
                var safeReason = string.IsNullOrWhiteSpace(request.ReviewNote)
                    ? "Khong co"
                    : System.Net.WebUtility.HtmlEncode(request.ReviewNote.Trim());

                var body = approved
                    ? $@"
                        <div style='font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;'>
                            <p>Xin chao <strong>{safeTenantName}</strong>,</p>
                            <p>Yeu cau doi goi sang <strong>{safePlanName}</strong> cua ban da duoc duyet.</p>
                            <p>Thoi gian duyet: <strong>{reviewedAt:dd/MM/yyyy HH:mm}</strong></p>
                            <p>Nguoi duyet: <strong>{safeReviewedBy}</strong></p>
                            <p>Hoa don se duoc tao tu dong de trung tam thuc hien thanh toan.</p>
                            <p>Tran trong,<br/>He thong Educen</p>
                        </div>"
                    : $@"
                        <div style='font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;'>
                            <p>Xin chao <strong>{safeTenantName}</strong>,</p>
                            <p>Yeu cau doi goi sang <strong>{safePlanName}</strong> cua ban da bi tu choi.</p>
                            <p>Thoi gian xu ly: <strong>{reviewedAt:dd/MM/yyyy HH:mm}</strong></p>
                            <p>Nguoi xu ly: <strong>{safeReviewedBy}</strong></p>
                            <p>Ly do: <strong>{safeReason}</strong></p>
                            <p>Tran trong,<br/>He thong Educen</p>
                        </div>";

                await _mailService.SendEmailAsync(recipientEmail, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Failed to send package change review email. RequestId={RequestId}, TenantId={TenantId}",
                    request.RequestId,
                    request.TenantId);
            }
        }
    }
}






