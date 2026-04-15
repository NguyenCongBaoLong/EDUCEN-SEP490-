using EducenAPI.DTOs.Assistants;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using EducenAPI.DTOs.Classes;
using EducenAPI.Ultils;

namespace EducenAPI.Services
{
    public class AssistantService : IAssistantService
    {
        private readonly EducenV2Context _context;
        private readonly MailService _mailService;

        public AssistantService(EducenV2Context context, MailService mailService)
        {
            _context = context;
            _mailService = mailService;
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
                    IsAccountSent = !string.IsNullOrEmpty(a.AssistantNavigation.Username) && 
                                    a.AssistantNavigation.AccountStatus != null && 
                                    a.AssistantNavigation.AccountStatus.ToLower() == "active",
                    AssignedClassesCount = _context.Classes.Count(c => c.AssistantId == a.UserId),
                    CreatedAt = DateTime.Now,
                    Schedule = a.Classes
                        .Where(c => c.Status != null && c.Status.ToLower() == "active")
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
                        .Where(c => c.Status != null && c.Status.ToLower() == "active")
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
            dto.Username = dto.Username?.Trim();
            dto.Email = dto.Email?.Trim()?.ToLower();
            dto.FullName = dto.FullName?.Trim();

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
                throw new Exception(ValidationMessages.DuplicateUsername);

            var existingEmail = await _context.Users
                .AnyAsync(u => u.Email == dto.Email);

            if (existingEmail)
                throw new Exception(ValidationMessages.DuplicateEmail);

            var assistantRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.RoleName == "Assistant");

            if (assistantRole == null)
                throw new Exception("Không tìm thấy vai trò trợ giảng.");

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
                    throw new Exception(ValidationMessages.DuplicateEmail);

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
                throw new Exception("Không thể xóa trợ giảng: trợ giảng đang được phân công vào lớp học.");

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
                return new { message = "Không tìm thấy trợ giảng." };

            var classes = await _context.Classes
                .Include(c => c.Grade)
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
                    GradeName = c.Grade != null ? c.Grade.GradeName : "",
                    TeacherName = c.Teacher != null ? c.Teacher.TeacherNavigation.FullName : "",
                    AssistantName = assistant.AssistantNavigation.FullName ?? "",
                    StudentCount = _context.Classes
                        .Where(cl => cl.ClassId == c.ClassId)
                        .Select(cl => cl.Students.Count)
                        .FirstOrDefault(),
                    MaxStudents = c.MaxStudents,
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

        public async Task<bool> SendAccountAsync(int assistantId)
        {
            var assistant = await _context.Assistants
                .Include(a => a.AssistantNavigation)
                .FirstOrDefaultAsync(a => a.UserId == assistantId);

            if (assistant == null)
                throw new Exception("Không tìm thấy trợ giảng.");

            var user = assistant.AssistantNavigation;

            if (string.IsNullOrWhiteSpace(user.Email))
                throw new Exception("Trợ giảng chưa có email. Vui lòng cập nhật email trước khi gửi tài khoản.");

            // Username = email (lowercase)
            var targetUsername = user.Email.Trim().ToLower();
            var usernameConflict = await _context.Users
                .AnyAsync(u => u.UserId != user.UserId && u.Username == targetUsername);
            if (usernameConflict)
                throw new Exception("Email này đã được dùng làm username cho tài khoản khác.");

            user.Username = targetUsername;

            // Generate password
            var newPassword = PasswordGenerator.GenerateSecurePassword();
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            user.AccountStatus = "Active";

            await _context.SaveChangesAsync();

            // Send email
            await _mailService.SendTeacherAccount(user.Email, user.Username, newPassword);

            return true;
        }
    }
}
