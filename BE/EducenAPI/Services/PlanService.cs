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

        public async Task<List<Plan>> GetAllPlansAsync()
        {
            return await _context.Plans.ToListAsync();
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

            var exists = await _context.Plans
                .AnyAsync(p => p.PlanName == name);

            if (exists)
                throw new Exception("Plan name already exists.");

            var plan = new Plan
            {
                PlanId = Guid.NewGuid().ToString(),
                PlanName = name,
                Price = request.Price,
                LimitUsers = request.LimitUsers,
                Features = request.Features?.Trim(),
                StorageLimit = request.StorageLimit
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

            var duplicate = await _context.Plans
                .AnyAsync(p => p.PlanName == name && p.PlanId != id);

            if (duplicate)
                throw new Exception("Plan name already exists.");

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
                .Include(p => p.Subscriptions)
                .FirstOrDefaultAsync(p => p.PlanId == id);

            if (plan == null)
                return false;

            if (plan.Subscriptions != null && plan.Subscriptions.Any())
                throw new Exception("Cannot delete plan because it has subscriptions.");

            _context.Plans.Remove(plan);

            await _context.SaveChangesAsync();

            return true;
        }
    }
}