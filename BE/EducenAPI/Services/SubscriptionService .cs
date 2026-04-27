using EducenAPI.DTOs.Subscription;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class SubscriptionService : ISubscriptionService
    {
        private readonly AdminDbContext _context;

        public SubscriptionService(AdminDbContext context)
        {
            _context = context;
        }

        public async Task<SubscriptionResponseDTO> RegisterSubscription(RegisterSubscriptionRequestDTO request)
        {
            var tenant = await _context.Tenants
                .FirstOrDefaultAsync(t => t.TenantId == request.TenantId);

            if (tenant == null)
                throw new Exception("Không tìm thấy trung tâm.");

            var plan = await _context.Plans
                .FirstOrDefaultAsync(p => p.PlanId == request.PlanId && p.IsActive);

            if (plan == null)
                throw new Exception("Không tìm thấy gói dịch vụ hoặc gói không còn hoạt động.");

            // 1. Kiểm tra xem tenant đã có gói này đang active chưa
            var existing = await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.TenantId == request.TenantId 
                                     && s.PlanId == request.PlanId 
                                     && s.Status == "Active" 
                                     && s.EndDate > DateTime.UtcNow);

            if (existing != null)
                throw new Exception("Trung tâm này đã đang ký gói này và vẫn còn hạn sử dụng.");

            // 2. Nếu đang ký gói mới, hủy tất cả các gói active cũ (nếu có)
            var activeSubs = await _context.Subscriptions
                .Where(s => s.TenantId == request.TenantId && s.Status == "Active")
                .ToListAsync();

            foreach (var sub in activeSubs)
            {
                sub.Status = "Cancelled";
                sub.EndDate = DateTime.UtcNow; // Hết hạn ngay lập tức
            }

            var startDate = DateTime.UtcNow;
            // Nếu có TestEndDate thì dùng nó (cho test), otherwise mặc định 1 tháng
            var endDate = startDate.AddMonths(1);

            var subscription = new Subscription
            {
                TenantId = tenant.TenantId,
                PlanId = plan.PlanId,
                StartDate = startDate,
                EndDate = endDate,
                Status = "Active"
            };

            _context.Subscriptions.Add(subscription);

            var payment = new PaymentRecord
            {
                TenantId = tenant.TenantId,
                Amount = plan.Price,
                Status = "Paid",
                PaymentDate = DateTime.UtcNow,
                TransactionType = "Subscription",
                ReferenceId = subscription.Id,
                PaymentMethod = "SystemAdmin",
                SubscriptionMonths = 1
            };

            _context.PaymentRecords.Add(payment);

            // Tạo credit cho tenant bằng với giá gói đã mua
            // Credit có thời hạn 12 tháng (có thể config trong appsettings)
            var creditExpirationMonths = 12; // Default 12 tháng
            tenant.CreditBalance += plan.Price;
            var creditLedger = new TenantCreditLedger
            {
                TenantId = tenant.TenantId,
                Amount = plan.Price,
                EntryType = "Credit",
                ReferenceType = "SubscriptionRegister",
                ReferenceId = subscription.Id,
                BalanceAfter = tenant.CreditBalance,
                ExpiredAt = DateTime.UtcNow.AddMonths(creditExpirationMonths),
                Note = $"Đang ký gói {plan.PlanName} - Tạo credit (hết hạn sau {creditExpirationMonths} tháng)"
            };
            _context.TenantCreditLedgers.Add(creditLedger);

            await _context.SaveChangesAsync();

            return new SubscriptionResponseDTO
            {
                SubscriptionId = subscription.Id,
                TenantId = tenant.TenantId,
                TenantName = tenant.TenantName,

                PlanId = plan.PlanId,
                PlanName = plan.PlanName,

                StartDate = subscription.StartDate,
                EndDate = subscription.EndDate,
                Status = subscription.Status
            };
        }

        public async Task<bool> CancelSubscription(string tenantId, bool immediate = false, bool createCredit = false)
        {
            var activeSubs = await _context.Subscriptions
                .Include(s => s.Plan)
                .Where(s => s.TenantId == tenantId && s.Status == "Active")
                .ToListAsync();

            if (!activeSubs.Any()) return false;

            var tenant = await _context.Tenants.FindAsync(tenantId);

            foreach (var sub in activeSubs)
            {
                // Business rule: không hoàn credit khi hủy/hủy gói.

                if (immediate)
                {
                    sub.Status = "Cancelled";
                    sub.EndDate = DateTime.UtcNow;
                }
                else
                {
                    // Hủy cuối kỳ - giữ nguyên EndDate
                    sub.Status = "Cancelled";
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// Tính credit hoàn lại từ gói cũ (theo thời gian còn lại)
        /// </summary>
        private decimal CalculateUnusedCreditInternal(Subscription currentSub)
        {
            if (currentSub?.Plan == null) return 0;
            if (currentSub.EndDate <= DateTime.UtcNow) return 0;

            var totalDays = (currentSub.EndDate - currentSub.StartDate).Days;
            if (totalDays <= 0) return 0;

            var remainingDays = (currentSub.EndDate - DateTime.UtcNow).Days;
            if (remainingDays < 0) remainingDays = 0;

            var dailyRate = currentSub.Plan.Price / totalDays;
            return Math.Round(dailyRate * remainingDays, 0, MidpointRounding.AwayFromZero);
        }

        public decimal CalculateUnusedCredit(Subscription subscription)
        {
            return CalculateUnusedCreditInternal(subscription);
        }

        public async Task<SubscriptionResponseDTO?> GetActiveSubscriptionAsync(string tenantId)
        {
            Console.WriteLine($"[GetActiveSubscriptionAsync] tenantId: {tenantId}");
            
            // First try to find valid active subscription
            var query1 = _context.Subscriptions
                .Include(s => s.Plan)
                .Include(s => s.Tenant)
                .Where(s => s.TenantId == tenantId && s.Status == "Active" && s.EndDate > DateTime.UtcNow)
                .OrderByDescending(s => s.EndDate)
                .ToQueryString();
            Console.WriteLine($"[GetActiveSubscriptionAsync] Query 1: {query1}");
            
            var subscription = await _context.Subscriptions
                .Include(s => s.Plan)
                .Include(s => s.Tenant)
                .Where(s => s.TenantId == tenantId && s.Status == "Active" && s.EndDate > DateTime.UtcNow)
                .OrderByDescending(s => s.EndDate)
                .FirstOrDefaultAsync();

            Console.WriteLine($"[GetActiveSubscriptionAsync] Found valid: {subscription?.Plan?.PlanName}, Status: {subscription?.Status}, EndDate: {subscription?.EndDate}");

            // If no valid subscription found, check if there's any subscription at all (even expired)
            if (subscription == null)
            {
                var allSubs = await _context.Subscriptions
                    .Where(s => s.TenantId == tenantId)
                    .ToListAsync();
                Console.WriteLine($"[GetActiveSubscriptionAsync] All subscriptions for tenant: {allSubs.Count}");
                
                foreach (var s in allSubs)
                {
                    Console.WriteLine($"  - Sub Id: {s.Id}, PlanId: {s.PlanId}, Status: {s.Status}, EndDate: {s.EndDate}");
                }

                subscription = await _context.Subscriptions
                    .Include(s => s.Plan)
                    .Include(s => s.Tenant)
                    .Where(s => s.TenantId == tenantId)
                    .OrderByDescending(s => s.EndDate)
                    .FirstOrDefaultAsync();

                Console.WriteLine($"[GetActiveSubscriptionAsync] Fallback found: {subscription?.Plan?.PlanName}");
            }

            if (subscription == null)
                return null;

            return new SubscriptionResponseDTO
            {
                SubscriptionId = subscription.Id,
                TenantId = subscription.TenantId,
                TenantName = subscription.Tenant?.TenantName ?? "",

                PlanId = subscription.PlanId,
                PlanName = subscription.Plan?.PlanName ?? "Unknown",
                PlanPrice = subscription.Plan?.Price ?? 0,

                StartDate = subscription.StartDate,
                EndDate = subscription.EndDate,

                Status = subscription.Status
            };
        }

        public async Task<SubscriptionResponseDTO> RenewSubscription(RenewSubscriptionRequestDTO request)
        {
            var subscription = await _context.Subscriptions
                .Include(s => s.Plan)
                .Include(s => s.Tenant)
                .Where(s => s.TenantId == request.TenantId && s.Status == "Active")
                .OrderByDescending(s => s.EndDate)
                .FirstOrDefaultAsync();

            if (subscription == null)
                throw new Exception("Không tìm thấy gói dịch vụ đang hoạt động để gia hạn.");

            if (!subscription.Plan.IsActive)
                throw new Exception($"Gói '{subscription.Plan.PlanName}' đã ngừng cung cấp. Vui lòng sử dụng chức năng 'Đổi gói' để chọn gói dịch vụ khác.");

            if (subscription.EndDate > DateTime.UtcNow)
            {
                subscription.EndDate = subscription.EndDate.AddMonths(request.Months);
            }
            else
            {
                subscription.StartDate = DateTime.UtcNow;
                subscription.EndDate = DateTime.UtcNow.AddMonths(request.Months);
                subscription.Status = "Active";
            }

            var payment = new PaymentRecord
            {
                TenantId = request.TenantId,
                Amount = subscription.Plan.Price * request.Months,
                Status = "Paid",
                PaymentDate = DateTime.UtcNow,
                TransactionType = "Subscription",
                ReferenceId = subscription.Id,
                PaymentMethod = "SystemAdmin",
                SubscriptionMonths = request.Months
            };

            _context.PaymentRecords.Add(payment);

            await _context.SaveChangesAsync();

            return new SubscriptionResponseDTO
            {
                SubscriptionId = subscription.Id,
                TenantId = subscription.TenantId,
                TenantName = subscription.Tenant.TenantName,

                PlanId = subscription.PlanId,
                PlanName = subscription.Plan.PlanName,
                PlanPrice = subscription.Plan.Price,

                StartDate = subscription.StartDate,
                EndDate = subscription.EndDate,
                Status = subscription.Status
            };
        }

        public async Task<SubscriptionResponseDTO> ChangePlan(ChangePlanRequestDTO request)
        {
            var tenant = await _context.Tenants
                .FirstOrDefaultAsync(t => t.TenantId == request.TenantId);

            if (tenant == null)
                throw new Exception("Không tìm thấy trung tâm.");

            var newPlan = await _context.Plans
                .FirstOrDefaultAsync(p => p.PlanId == request.NewPlanId);

            if (newPlan == null)
                throw new Exception("Không tìm thấy gói dịch vụ.");

            var currentSub = await _context.Subscriptions
                .Include(s => s.Plan)
                .Where(s => s.TenantId == request.TenantId && s.Status == "Active")
                .FirstOrDefaultAsync();

            if (currentSub != null)
            {
                // Kiểm tra quy tắc đổi gói: nâng gói bất cứ lúc nào, hạ gói chỉ trong 7 ngày đầu
                var daysSinceStart = (DateTime.UtcNow - currentSub.StartDate).Days;
                const int GRACE_PERIOD_DAYS = 7;
                
                if (newPlan.Price < currentSub.Plan.Price && daysSinceStart > GRACE_PERIOD_DAYS)
                {
                    throw new Exception("Chỉ được hạ gói trong 7 ngày đầu tiên của gói dịch vụ. Nâng gói có thể thực hiện bất cứ lúc nào.");
                }
                
                // Business rule: changing plan does not create refund/top-up entries.

                // Chính sách mới: downgrade hiệu lực kỳ sau (không hủy gói cũ ngay)
                if (request.EffectiveImmediately && newPlan.Price < currentSub.Plan.Price)
                {
                    // Downgrade ngay chỉ được trong grace period
                    if (daysSinceStart > GRACE_PERIOD_DAYS)
                    {
                        // Ngoài grace period thì downgrade hiệu lực kỳ sau
                        request.EffectiveImmediately = false;
                    }
                    else
                    {
                        // Trong grace period thì downgrade ngay
                        currentSub.Status = "Cancelled";
                        currentSub.EndDate = DateTime.UtcNow;
                    }
                }
                else if (request.EffectiveImmediately)
                {
                    // Upgrade hoặc downgrade trong grace period thì hủy gói cũ ngay
                    currentSub.Status = "Cancelled";
                    currentSub.EndDate = DateTime.UtcNow;
                }
            }

            // Ngày bắt đầu và kết thúc gói mới
            var startDate = request.EffectiveImmediately ? DateTime.UtcNow : (currentSub?.EndDate > DateTime.UtcNow ? currentSub.EndDate : DateTime.UtcNow);
            var endDate = startDate.AddMonths(request.Months);

            var newSubscription = new Subscription
            {
                TenantId = tenant.TenantId,
                PlanId = newPlan.PlanId,
                StartDate = startDate,
                EndDate = endDate,
                Status = "Active"
            };

            _context.Subscriptions.Add(newSubscription);

            // Business rule: changing plan does not deduct credit immediately.
            // Credit is deducted daily by CreditDeductionService with formula planPrice/30.
            var payment = new PaymentRecord
            {
                TenantId = request.TenantId,
                Amount = 0,
                Status = "Paid",
                PaymentDate = DateTime.UtcNow,
                TransactionType = "Subscription",
                ReferenceId = newSubscription.Id,
                PaymentMethod = "Credit",
                SubscriptionMonths = request.Months,
                Description = $"Changed to plan {newPlan.PlanName} ({request.Months} month(s)) - no immediate credit deduction"
            };
            _context.PaymentRecords.Add(payment);

            await _context.SaveChangesAsync();

            return new SubscriptionResponseDTO
            {
                SubscriptionId = newSubscription.Id,
                TenantId = tenant.TenantId,
                TenantName = tenant.TenantName,
                PlanId = newPlan.PlanId,
                PlanName = newPlan.PlanName,
                PlanPrice = newPlan.Price,
                StartDate = newSubscription.StartDate,
                EndDate = newSubscription.EndDate,
                Status = newSubscription.Status
            };
        }
    }
}
