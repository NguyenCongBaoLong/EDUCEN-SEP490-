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

        public async Task<Plan?> GetPlanByIdAsync(string id)
        {
            return await _context.Plans.FindAsync(id);
        }

        public async Task<Plan> CreatePlanAsync(CreatePlanRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.PlanName))
                throw new Exception("Plan name cannot be empty.");

            var name = request.PlanName.Trim();

            var exists = await _context.Plans.AnyAsync(p => p.PlanName == name);
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
                throw new Exception("Plan name cannot be empty.");

            var name = request.PlanName.Trim();

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
            // Always soft delete to keep historical references for subscriptions/invoices.
            // Inactive plans are excluded by listing queries (GetAllPlansAsync).
            plan.IsActive = false;

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> SetPlanActiveStatusAsync(string id, bool isActive)
        {
            var plan = await _context.Plans.FirstOrDefaultAsync(p => p.PlanId == id);
            if (plan == null) return false;
            plan.IsActive = isActive;
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
