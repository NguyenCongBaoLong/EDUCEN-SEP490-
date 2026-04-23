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
                throw new Exception("Kh?ng t?m th?y trung t?m.");

            var plan = await _context.Plans
                .FirstOrDefaultAsync(p => p.PlanId == request.PlanId && p.IsActive);

            if (plan == null)
                throw new Exception("Kh?ng t?m th?y g?i d?ch v? ho?c g?i kh?ng c?n ho?t d?ng.");

            // 1. Ki?m tra xem tenant d? c? g?i n?y dang active chua
            var existing = await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.TenantId == request.TenantId 
                                     && s.PlanId == request.PlanId 
                                     && s.Status == "Active" 
                                     && s.EndDate > DateTime.UtcNow);

            if (existing != null)
                throw new Exception("Trung t?m n?y d? dang k? g?i n?y v? v?n c?n h?n s? d?ng.");

            // 2. N?u dang k? g?i m?i, h?y t?t c? c?c g?i active cu (n?u c?)
            var activeSubs = await _context.Subscriptions
                .Where(s => s.TenantId == request.TenantId && s.Status == "Active")
                .ToListAsync();

            foreach (var sub in activeSubs)
            {
                sub.Status = "Cancelled";
                sub.EndDate = DateTime.UtcNow; // H?t h?n ngay l?p t?c
            }

            var startDate = DateTime.UtcNow;
            // N?u c? TestEndDate th? d?ng n? (cho test), otherwise m?c d?nh 1 th?ng
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

            // T?o credit cho tenant b?ng v?i gi? g?i d? mua
            // Credit c? th?i h?n 12 th?ng (c? th? config trong appsettings)
            var creditExpirationMonths = 12; // Default 12 th?ng
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
                Note = $"?ang k? g?i {plan.PlanName} - T?o credit (h?t h?n sau {creditExpirationMonths} th?ng)"
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
                // Business rule: kh?ng ho?n credit khi h?y/h? g?i.

                if (immediate)
                {
                    sub.Status = "Cancelled";
                    sub.EndDate = DateTime.UtcNow;
                }
                else
                {
                    // H?y cu?i k? - gi? nguy?n EndDate
                    sub.Status = "Cancelled";
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// T?nh credit ho?n l?i t? g?i cu (theo th?i gian c?n l?i)
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
                throw new Exception("Kh?ng t?m th?y g?i d?ch v? dang ho?t d?ng d? gia h?n.");

            if (!subscription.Plan.IsActive)
                throw new Exception($"G?i '{subscription.Plan.PlanName}' d? ng?ng cung c?p. Vui l?ng s? d?ng ch?c nang '??i g?i' d? ch?n g?i d?ch v? kh?c.");

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
                throw new Exception("Kh?ng t?m th?y trung t?m.");

            var newPlan = await _context.Plans
                .FirstOrDefaultAsync(p => p.PlanId == request.NewPlanId);

            if (newPlan == null)
                throw new Exception("Kh?ng t?m th?y g?i d?ch v?.");

            var currentSub = await _context.Subscriptions
                .Include(s => s.Plan)
                .Where(s => s.TenantId == request.TenantId && s.Status == "Active")
                .FirstOrDefaultAsync();

            if (currentSub != null)
            {
                // Ki?m tra quy t?c d?i g?i: n?ng g?i b?t c? l?c n?o, h? g?i ch? trong 7 ng?y d?u
                var daysSinceStart = (DateTime.UtcNow - currentSub.StartDate).Days;
                const int GRACE_PERIOD_DAYS = 7;
                
                if (newPlan.Price < currentSub.Plan.Price && daysSinceStart > GRACE_PERIOD_DAYS)
                {
                    throw new Exception("Ch? du?c h? g?i trong 7 ng?y d?u ti?n c?a g?i d?ch v?. N?ng g?i c? th? th?c hi?n b?t c? l?c n?o.");
                }
                
                // Business rule: changing plan does not create refund/top-up entries.

                // Ch?nh s?ch m?i: downgrade hi?u l?c k? sau (kh?ng h?y g?i cu ngay)
                if (request.EffectiveImmediately && newPlan.Price < currentSub.Plan.Price)
                {
                    // Downgrade ngay ch? du?c trong grace period
                    if (daysSinceStart > GRACE_PERIOD_DAYS)
                    {
                        // Ngo?i grace period ? downgrade hi?u l?c k? sau
                        request.EffectiveImmediately = false;
                    }
                    else
                    {
                        // Trong grace period ? downgrade ngay
                        currentSub.Status = "Cancelled";
                        currentSub.EndDate = DateTime.UtcNow;
                    }
                }
                else if (request.EffectiveImmediately)
                {
                    // Upgrade ho?c downgrade trong grace period ? h?y g?i cu ngay
                    currentSub.Status = "Cancelled";
                    currentSub.EndDate = DateTime.UtcNow;
                }
            }

            // Ng?y b?t d?u v? k?t th?c g?i m?i
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
