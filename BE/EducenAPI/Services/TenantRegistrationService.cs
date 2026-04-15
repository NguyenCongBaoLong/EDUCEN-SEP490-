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


            await _context.SaveChangesAsync();

            return true;
        }
    }
}
