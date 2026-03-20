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
                .FirstOrDefaultAsync(p => p.PlanId == request.PlanId);

            if (plan == null)
                throw new Exception("Plan not found");

            var startDate = DateTime.UtcNow;
            var endDate = startDate.AddMonths(1); // giả sử gói 1 tháng

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

        public async Task<SubscriptionResponseDTO> RenewSubscription(RenewSubscriptionRequestDTO request)
        {
            var subscription = await _context.Subscriptions
                .Include(s => s.Plan)
                .Include(s => s.Tenant)
                .Where(s => s.TenantId == request.TenantId && s.Status == "Active")
                .OrderByDescending(s => s.EndDate)
                .FirstOrDefaultAsync();

            if (subscription == null)
                throw new Exception("Active subscription not found");

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