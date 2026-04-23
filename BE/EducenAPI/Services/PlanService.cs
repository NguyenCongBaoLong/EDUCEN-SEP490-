using EducenAPI.DTOs.Plans;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class PlanService : IPlanService
    {
        private readonly AdminDbContext _context;

        public PlanService(AdminDbContext context)
        {
            _context = context;
        }

        public async Task<List<Plan>> GetAllPlansAsync(bool includeInactive = false)
        {
            var query = _context.Plans.AsQueryable();
            if (!includeInactive)
            {
                query = query.Where(p => p.IsActive);
            }

            return await query.OrderByDescending(p => p.Price).ToListAsync();
        }

        public async Task<List<Plan>> GetPlansForTenantAsync(string tenantId)
        {
            var allPlans = await _context.Plans.OrderByDescending(p => p.Price).ToListAsync();
            
            // Check if tenant has active subscription using this plan
            var tenantActivePlanIds = await _context.Subscriptions
                .Where(s => s.TenantId == tenantId && s.Status == "Active" && s.EndDate > DateTime.UtcNow)
                .Select(s => s.PlanId)
                .Distinct()
                .ToListAsync();

            // Return all active plans + inactive plans that tenant is currently using
            var plansForTenant = allPlans
                .Where(p => p.IsActive || tenantActivePlanIds.Contains(p.PlanId))
                .ToList();

            return plansForTenant;
        }

        public async Task<List<PlanDto>> GetPlansForTenantWithStatusAsync(string tenantId)
        {
            var allPlans = await _context.Plans.OrderByDescending(p => p.Price).ToListAsync();
            
            // Check if tenant has active subscription using this plan
            var tenantActivePlanIds = await _context.Subscriptions
                .Where(s => s.TenantId == tenantId && s.Status == "Active" && s.EndDate > DateTime.UtcNow)
                .Select(s => s.PlanId)
                .Distinct()
                .ToListAsync();

            // Return all active plans + inactive plans that tenant is currently using
            var plansForTenant = allPlans
                .Where(p => p.IsActive || tenantActivePlanIds.Contains(p.PlanId))
                .Select(p => new PlanDto
                {
                    PlanId = p.PlanId,
                    PlanName = p.PlanName,
                    Price = p.Price,
                    LimitUsers = p.LimitUsers,
                    Features = p.Features,
                    StorageLimit = p.StorageLimit,
                    IsActive = p.IsActive,
                    IsTrial = p.IsTrial,
                    TrialDays = p.TrialDays,
                    IsDeprecated = !p.IsActive && tenantActivePlanIds.Contains(p.PlanId)
                })
                .ToList();

            return plansForTenant;
        }

        public async Task<Plan?> GetPlanByIdAsync(string id)
        {
            return await _context.Plans.FindAsync(id);
        }

        public async Task<Plan> CreatePlanAsync(CreatePlanRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.PlanName))
                throw new Exception("Tên gói dịch vụ không được để trống.");

            var name = request.PlanName.Trim();
            var exists = await _context.Plans
                .AnyAsync(p => p.PlanName.ToLower() == name.ToLower());

            if (exists)
                throw new InvalidOperationException("Tên gói dịch vụ đã tồn tại.");

            var plan = new Plan
            {
                PlanId = Guid.NewGuid().ToString(),
                PlanName = name,
                Price = request.Price,
                LimitUsers = request.LimitUsers,
                Features = request.Features?.Trim(),
                StorageLimit = request.StorageLimit,
                IsActive = true
            };

            _context.Plans.Add(plan);
            await _context.SaveChangesAsync();

            return plan;
        }

        public async Task<bool> UpdatePlanAsync(string id, UpdatePlanRequest request)
        {
            var existingPlan = await _context.Plans.FindAsync(id);
            if (existingPlan == null)
                return false;

            if (string.IsNullOrWhiteSpace(request.PlanName))
                throw new Exception("Tên gói dịch vụ không được để trống.");

            var name = request.PlanName.Trim();
            var duplicatedName = await _context.Plans
                .AnyAsync(p => p.PlanId != id && p.PlanName.ToLower() == name.ToLower());
            if (duplicatedName)
                throw new InvalidOperationException("Tên gói dịch vụ đã tồn tại.");

            existingPlan.PlanName = name;
            existingPlan.Price = request.Price;
            existingPlan.LimitUsers = request.LimitUsers;
            existingPlan.Features = request.Features?.Trim();
            existingPlan.StorageLimit = request.StorageLimit;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeletePlanAsync(string id)
        {
            var plan = await _context.Plans
                .FirstOrDefaultAsync(p => p.PlanId == id);

            if (plan == null)
                return false;

            // Check if plan is already archived (inactive)
            if (plan.IsActive)
            {
                throw new InvalidOperationException("Chỉ có thể xóa gói đã lưu trữ. Vui lòng lưu trữ gói trước khi xóa.");
            }

            // Check if any centers are using this plan
            var hasActiveSubscriptions = await _context.Subscriptions
                .AnyAsync(s => s.PlanId == id && s.Status == "Active" && s.EndDate > DateTime.UtcNow);

            if (hasActiveSubscriptions)
            {
                throw new InvalidOperationException("Không thể xóa gói dịch vụ vì đang được sử dụng bởi các trung tâm hoạt động.");
            }

            // Hard delete - remove the plan from database
            _context.Plans.Remove(plan);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SetPlanActiveStatusAsync(string id, bool isActive)
        {
            var plan = await _context.Plans.FirstOrDefaultAsync(p => p.PlanId == id);
            if (plan == null)
                return false;

            // Allow deactivation even when centers are using it
            // Centers using the plan will still see it but with a deprecation notice
            // Centers not using it will not see it
            plan.IsActive = isActive;
            await _context.SaveChangesAsync();
            return true;
        }
    }
}