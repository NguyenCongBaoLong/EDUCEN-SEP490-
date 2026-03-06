using EducenAPI.DTOs.Assistants;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class AssistantService : IAssistantService
    {
        private readonly EducenV2Context _context;

        public AssistantService(EducenV2Context context)
        {
            _context = context;
        }

        public async Task<IEnumerable<AssistantDto>> GetAllAssistantsAsync()
        {
            return await _context.Assistants
                .Include(a => a.AssistantNavigation)
                .Select(a => new AssistantDto
                {
                    AssistantId = a.UserId,
                    UserId = a.UserId,
                    Username = a.AssistantNavigation.Username,
                    FullName = a.AssistantNavigation.FullName ?? "",
                    Email = a.AssistantNavigation.Email ?? "",
                    PhoneNumber = a.AssistantNavigation.PhoneNumber,
                    SupportLevel = a.SupportLevel,
                    AccountStatus = a.AssistantNavigation.AccountStatus,
                    AssignedClassesCount = _context.Classes.Count(c => c.AssistantId == a.UserId),
                    CreatedAt = DateTime.Now
                })
                .ToListAsync();
        }

        public async Task<AssistantDto?> GetAssistantByIdAsync(int id)
        {
            return await _context.Assistants
                .Include(a => a.AssistantNavigation)
                .Where(a => a.UserId == id)
                .Select(a => new AssistantDto
                {
                    AssistantId = a.UserId,
                    UserId = a.UserId,
                    Username = a.AssistantNavigation.Username,
                    FullName = a.AssistantNavigation.FullName ?? "",
                    Email = a.AssistantNavigation.Email ?? "",
                    PhoneNumber = a.AssistantNavigation.PhoneNumber,
                    SupportLevel = a.SupportLevel,
                    AccountStatus = a.AssistantNavigation.AccountStatus,
                    AssignedClassesCount = _context.Classes.Count(c => c.AssistantId == a.UserId),
                    CreatedAt = DateTime.Now
                })
                .FirstOrDefaultAsync();
        }

        public async Task<AssistantDto> CreateAssistantAsync(CreateAssistantDto dto)
        {
            var existingUser = await _context.Users
                .AnyAsync(u => u.Username == dto.Username);

            if (existingUser)
                throw new Exception("Username already exists");

            var existingEmail = await _context.Users
                .AnyAsync(u => u.Email == dto.Email);

            if (existingEmail)
                throw new Exception("Email already exists");

            var assistantRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.RoleName == "Assistant");

            if (assistantRole == null)
                throw new Exception("Assistant role not found");

            var user = new User
            {
                Username = dto.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                RoleId = assistantRole.RoleId,
                FullName = dto.FullName,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                AccountStatus = "Active"
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var assistant = new Assistant
            {
                UserId = user.UserId,
                SupportLevel = dto.SupportLevel
            };

            _context.Assistants.Add(assistant);
            await _context.SaveChangesAsync();

            return new AssistantDto
            {
                AssistantId = assistant.UserId,
                UserId = user.UserId,
                Username = user.Username,
                FullName = user.FullName ?? "",
                Email = user.Email ?? "",
                PhoneNumber = user.PhoneNumber,
                SupportLevel = assistant.SupportLevel,
                AccountStatus = user.AccountStatus,
                AssignedClassesCount = 0,
                CreatedAt = DateTime.Now
            };
        }

        public async Task<bool> UpdateAssistantAsync(int id, UpdateAssistantDto dto)
        {
            var assistant = await _context.Assistants
                .Include(a => a.AssistantNavigation)
                .FirstOrDefaultAsync(a => a.UserId == id);

            if (assistant == null)
                return false;

            if (!string.IsNullOrEmpty(dto.FullName))
                assistant.AssistantNavigation.FullName = dto.FullName;

            if (!string.IsNullOrEmpty(dto.Email))
            {
                var emailExists = await _context.Users
                    .AnyAsync(u => u.Email == dto.Email && u.UserId != assistant.UserId);

                if (emailExists)
                    throw new Exception("Email already exists");

                assistant.AssistantNavigation.Email = dto.Email;
            }

            if (dto.PhoneNumber != null)
                assistant.AssistantNavigation.PhoneNumber = dto.PhoneNumber;

            if (dto.SupportLevel != null)
                assistant.SupportLevel = dto.SupportLevel;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAssistantAsync(int id)
        {
            var assistant = await _context.Assistants
                .Include(a => a.AssistantNavigation)
                .FirstOrDefaultAsync(a => a.UserId == id);

            if (assistant == null)
                return false;

            var hasAssignedClasses = await _context.Classes
                .AnyAsync(c => c.AssistantId == id);

            if (hasAssignedClasses)
                throw new Exception("Cannot delete assistant: assistant has assigned classes");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Assistants.Remove(assistant);
                _context.Users.Remove(assistant.AssistantNavigation);
                
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}
