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
    }
}