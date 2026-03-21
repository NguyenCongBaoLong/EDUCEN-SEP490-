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
                throw new Exception("Tenant not found");

            var plan = await _context.Plans
                .FirstOrDefaultAsync(p => p.PlanId == request.PlanId && p.IsActive);

            if (plan == null)
                throw new Exception("Plan not found or is no longer active.");

            // 1. Kiểm tra xem tenant đã có gói này đang active chưa
            var existing = await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.TenantId == request.TenantId 
                                     && s.PlanId == request.PlanId 
                                     && s.Status == "Active" 
                                     && s.EndDate > DateTime.UtcNow);

            if (existing != null)
                throw new Exception("Trung tâm này đã đăng ký gói này và vẫn còn hạn sử dụng.");

            // 2. Nếu đăng ký gói mới, hủy tất cả các gói active cũ (nếu có)
            var activeSubs = await _context.Subscriptions
                .Where(s => s.TenantId == request.TenantId && s.Status == "Active")
                .ToListAsync();

            foreach (var sub in activeSubs)
            {
                sub.Status = "Cancelled";
                sub.EndDate = DateTime.UtcNow; // Hết hạn ngay lập tức
            }

            var startDate = DateTime.UtcNow;
            var endDate = startDate.AddMonths(1); // mặc định gói 1 tháng

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
                PaymentDate = DateTime.UtcNow
            };

            _context.PaymentRecords.Add(payment);

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

        public async Task<bool> CancelSubscription(string tenantId)
        {
            var activeSubs = await _context.Subscriptions
                .Where(s => s.TenantId == tenantId && s.Status == "Active")
                .ToListAsync();

            if (!activeSubs.Any()) return false;

            foreach (var sub in activeSubs)
            {
                sub.Status = "Cancelled";
                sub.EndDate = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return true;
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
                PaymentDate = DateTime.UtcNow
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
                throw new Exception("Tenant not found");

            var newPlan = await _context.Plans
                .FirstOrDefaultAsync(p => p.PlanId == request.NewPlanId);

            if (newPlan == null)
                throw new Exception("Plan not found");

            var currentSub = await _context.Subscriptions
                .Where(s => s.TenantId == request.TenantId && s.Status == "Active")
                .FirstOrDefaultAsync();

            if (currentSub != null)
            {
                currentSub.Status = "Cancelled";
                currentSub.EndDate = DateTime.UtcNow;
            }

            var startDate = DateTime.UtcNow;
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

            var payment = new PaymentRecord
            {
                TenantId = tenant.TenantId,
                Amount = newPlan.Price * request.Months,
                Status = "Paid",
                PaymentDate = DateTime.UtcNow
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

                StartDate = newSubscription.StartDate,
                EndDate = newSubscription.EndDate,
                Status = newSubscription.Status
            };
        }
    }
}