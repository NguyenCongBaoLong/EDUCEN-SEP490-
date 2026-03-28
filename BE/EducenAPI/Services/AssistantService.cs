using EducenAPI.DTOs.Assistants;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using EducenAPI.DTOs.Classes;

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
                .Include(a => a.Classes)
                    .ThenInclude(c => c.Schedules)
                .Select(a => new AssistantDto
                {
                    AssistantId = a.UserId,
                    UserId = a.UserId,
                    Username = a.AssistantNavigation.Username,
                    FullName = a.AssistantNavigation.FullName ?? "",
                    Email = a.AssistantNavigation.Email ?? "",
                    PhoneNumber = a.AssistantNavigation.PhoneNumber,
                    Address = a.AssistantNavigation.Address,
                    SupportLevel = a.SupportLevel,
                    AccountStatus = a.AssistantNavigation.AccountStatus,
                    AssignedClassesCount = _context.Classes.Count(c => c.AssistantId == a.UserId),
                    CreatedAt = DateTime.Now,
                    Schedule = a.Classes
                        .Where(c => c.Status.ToLower() == "active")
                        .SelectMany(c => c.Schedules)
                        .Select(s => new CreateScheduleSlotDto
                        {
                            DayOfWeek = s.DayOfWeek,
                            StartTime = s.StartTime.ToString("HH:mm"),
                            EndTime = s.EndTime.ToString("HH:mm")
                        }).ToList()
                })
                .ToListAsync();
        }

        public async Task<AssistantDto?> GetAssistantByIdAsync(int id)
        {
            return await _context.Assistants
                .Include(a => a.AssistantNavigation)
                .Include(a => a.Classes)
                    .ThenInclude(c => c.Schedules)
                .Where(a => a.UserId == id)
                .Select(a => new AssistantDto
                {
                    AssistantId = a.UserId,
                    UserId = a.UserId,
                    Username = a.AssistantNavigation.Username,
                    FullName = a.AssistantNavigation.FullName ?? "",
                    Email = a.AssistantNavigation.Email ?? "",
                    PhoneNumber = a.AssistantNavigation.PhoneNumber,
                    Address = a.AssistantNavigation.Address,
                    SupportLevel = a.SupportLevel,
                    AccountStatus = a.AssistantNavigation.AccountStatus,
                    AssignedClassesCount = a.Classes.Count,
                    CreatedAt = DateTime.Now,
                    Schedule = a.Classes
                        .Where(c => c.Status.ToLower() == "active")
                        .SelectMany(c => c.Schedules)
                        .Select(s => new CreateScheduleSlotDto
                        {
                            DayOfWeek = s.DayOfWeek,
                            StartTime = s.StartTime.ToString("HH:mm"),
                            EndTime = s.EndTime.ToString("HH:mm")
                        }).ToList()
                })
                .FirstOrDefaultAsync();
        }

        public async Task<AssistantDto> CreateAssistantAsync(CreateAssistantDto dto)
        {
            // Skip user creation if username or password is null
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            {
                // Create assistant profile without user account
                var assistantProfile = new Assistant
                {
                    UserId = 0, // Will be set when account is created
                    SupportLevel = dto.SupportLevel
                };

                _context.Assistants.Add(assistantProfile);
                await _context.SaveChangesAsync();

                return new AssistantDto
                {
                    AssistantId = assistantProfile.UserId,
                    UserId = assistantProfile.UserId,
                    Username = "",
                    FullName = dto.FullName,
                    Email = dto.Email,
                    PhoneNumber = dto.PhoneNumber,
                    SupportLevel = assistantProfile.SupportLevel,
                    AccountStatus = "Pending",
                    AssignedClassesCount = 0,
                    CreatedAt = DateTime.Now
                };
            }

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
                Address = dto.Address,
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

            if (dto.Address != null)
                assistant.AssistantNavigation.Address = dto.Address;

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

        public async Task<object> GetAssistantClassesAsync(int id)
        {
            var assistant = await _context.Assistants
                .Include(a => a.AssistantNavigation)
                .FirstOrDefaultAsync(a => a.UserId == id);

            if (assistant == null)
                return new { message = "Assistant not found" };

            var classes = await _context.Classes
                .Include(c => c.Subject)
                .Include(c => c.Teacher)
                    .ThenInclude(t => t!.TeacherNavigation)
                .Include(c => c.Assistant)
                    .ThenInclude(a => a!.AssistantNavigation)
                .Include(c => c.Sessions)
                .Include(c => c.Schedules)
                .Where(c => c.AssistantId == id)
                .Select(c => new
                {
                    c.ClassId,
                    c.ClassName,
                    c.Description,
                    c.Status,
                    c.StartDate,
                    c.EndDate,
                    TotalSessions = c.Sessions.Count,
                    CompletedSessions = c.Sessions.Count(s => s.Status == "Completed" || s.SessionDate < DateTime.Now),
                    SubjectName = c.Subject != null ? c.Subject.SubjectName : "",
                    TeacherName = c.Teacher != null ? c.Teacher.TeacherNavigation.FullName : "",
                    AssistantName = assistant.AssistantNavigation.FullName ?? "",
                    StudentCount = _context.Classes
                        .Where(cl => cl.ClassId == c.ClassId)
                        .Select(cl => cl.Students.Count)
                        .FirstOrDefault(),
                    ScheduleSlots = c.Schedules.Select(s => new
                    {
                        s.DayOfWeek,
                        StartTime = s.StartTime.ToString("HH:mm"),
                        EndTime = s.EndTime.ToString("HH:mm")
                    }).ToList()
                })
                .ToListAsync();

            return classes;
        }
    }
}
