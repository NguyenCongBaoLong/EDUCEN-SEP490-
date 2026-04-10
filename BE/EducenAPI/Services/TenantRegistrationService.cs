using EducenAPI.DTOs.TenantRegistrations;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class TenantRegistrationService : ITenantRegistrationService
    {
        private readonly AdminDbContext _context;

        public TenantRegistrationService(AdminDbContext context)
        {
            _context = context;
        }

        public async Task<TenantRegistration> CreateRegistrationAsync(CreateRegistrationRequest request)
        {
            var registration = new TenantRegistration
            {
                RegistrationId = Guid.NewGuid().ToString(),
                CenterName = request.CenterName.Trim(),
                ContactPerson = request.ContactPerson?.Trim(),
                Email = request.Email?.Trim(),
                PhoneNumber = request.PhoneNumber?.Trim(),
                Message = request.Message?.Trim(),
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            _context.TenantRegistrations.Add(registration);

            await _context.SaveChangesAsync();

            return registration;
        }

        public async Task<List<TenantRegistration>> GetAllAsync()
        {
            return await _context.TenantRegistrations
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
        }

        public async Task<bool> UpdateStatusAsync(string id, string status)
        {
            var reg = await _context.TenantRegistrations.FindAsync(id);

            if (reg == null)
                return false;

            reg.Status = status;

            // Khi duyệt registration, tự động tạo Tenant
            if (status == "Approved")
            {
                var tenantId = Guid.NewGuid().ToString();
                var subDomain = reg.CenterName.ToLower().Replace(" ", "-") + "-" + tenantId[..8];
                var connectionString = $"Server=.;Database=Educen_{tenantId[..8]};Trusted_Connection=True;TrustServerCertificate=True";
                var defaultUsername = $"admin_{subDomain}";
                var defaultPasswordHash = BCrypt.Net.BCrypt.HashPassword("default123");
                
                var tenant = new Tenant
                {
                    TenantId = tenantId,
                    TenantName = reg.CenterName,
                    Username = defaultUsername,
                    Password = defaultPasswordHash,
                    ContactPerson = reg.ContactPerson,
                    Email = reg.Email,
                    PhoneNumber = reg.PhoneNumber,
                    SubDomain = subDomain,
                    ConnectionString = connectionString,
                    IsActive = true,
                    CreditBalance = 0
                };
                _context.Tenants.Add(tenant);

                // Tự động gán gói dịch vụ cho tenant mới (ưu tiên gói rẻ nhất, bao gồm cả Trial)
                var allPlans = await _context.Plans.Where(p => p.IsActive).ToListAsync();
                var cheapestPlan = allPlans.OrderBy(p => p.Price).FirstOrDefault();

                if (cheapestPlan != null)
                {
                    var startDate = DateTime.UtcNow;
                    var subscription = new Subscription
                    {
                        TenantId = tenantId,
                        PlanId = cheapestPlan.PlanId,
                        StartDate = startDate,
                        EndDate = cheapestPlan.IsTrial ? startDate.AddDays(cheapestPlan.TrialDays) : startDate.AddMonths(1),
                        Status = "Active"
                    };
                    _context.Subscriptions.Add(subscription);

                    // Tạo credit ledger cho gói đăng ký
                    var creditLedger = new TenantCreditLedger
                    {
                        TenantId = tenantId,
                        Amount = cheapestPlan.Price,
                        EntryType = "Credit",
                        ReferenceType = "RegistrationApproved",
                        ReferenceId = subscription.Id,
                        BalanceAfter = cheapestPlan.Price,
                        Note = $"Đăng ký gói {cheapestPlan.PlanName} khi duyệt registration"
                    };
                    _context.TenantCreditLedgers.Add(creditLedger);
                }
            }

            await _context.SaveChangesAsync();

            return true;
        }
    }
}
