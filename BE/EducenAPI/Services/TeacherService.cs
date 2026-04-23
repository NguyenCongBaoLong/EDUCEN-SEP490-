using EducenAPI.DTOs.Teachers;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
using Microsoft.EntityFrameworkCore;
using EducenAPI.DTOs.Classes;

namespace EducenAPI.Services
{
    public class TeacherService : ITeacherService
    {
        private readonly EducenV2Context _context;
        private readonly MailService _mailService;

        public TeacherService(EducenV2Context context, MailService mailService)
        {
            _context = context;
            _mailService = mailService;
        }

        public async Task<IEnumerable<TeacherDto>> GetAllTeachersAsync()
        {
            return await _context.Teachers
                .Include(t => t.TeacherNavigation)
                .Select(t => new TeacherDto
                {
                    TeacherId = t.UserId,
                    UserId = t.UserId,
                    Username = t.TeacherNavigation.Username,
                    FullName = t.TeacherNavigation.FullName ?? "",
                    Email = t.TeacherNavigation.Email ?? "",
                    PhoneNumber = t.TeacherNavigation.PhoneNumber,
                    Address = t.TeacherNavigation.Address,
                    Specialization = t.Specialization ?? "",
                    Degree = t.Degree,
                    AccountStatus = t.TeacherNavigation.AccountStatus,
                    IsAccountSent = !string.IsNullOrEmpty(t.TeacherNavigation.Username) && 
                                    t.TeacherNavigation.AccountStatus != null &&
                                    t.TeacherNavigation.AccountStatus.ToLower() == "active",
                    ClassesCount = _context.Classes.Count(c => c.TeacherId == t.UserId),
                    CreatedAt = DateTime.Now,
                    Schedule = t.Classes
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

        public async Task<TeacherDto?> GetTeacherByIdAsync(int id)
        {
            return await _context.Teachers
                .Include(t => t.TeacherNavigation)
                .Include(t => t.Classes)
                .Where(t => t.UserId == id)
                .Select(t => new TeacherDto
                {
                    TeacherId = t.UserId,
                    UserId = t.UserId,
                    Username = t.TeacherNavigation.Username,
                    FullName = t.TeacherNavigation.FullName ?? "",
                    Email = t.TeacherNavigation.Email ?? "",
                    PhoneNumber = t.TeacherNavigation.PhoneNumber,
                    Address = t.TeacherNavigation.Address,
                    Specialization = t.Specialization ?? "",
                    Degree = t.Degree,
                    AccountStatus = t.TeacherNavigation.AccountStatus,
                    ClassesCount = t.Classes.Count,
                    CreatedAt = DateTime.Now,
                    Schedule = t.Classes
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

        public async Task<TeacherDto> CreateTeacherAsync(CreateTeacherDto dto)
        {
            dto.Username = dto.Username?.Trim();
            dto.Email = dto.Email?.Trim()?.ToLower();
            dto.FullName = dto.FullName?.Trim();

            var existingEmail = await _context.Users
                .AnyAsync(u => u.Email == dto.Email);

            if (existingEmail)
                throw new Exception("Email đã tồn tại.");

            var teacherRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.RoleName == "Teacher");

            if (teacherRole == null)
                throw new Exception("Không tìm thấy vai trò Giáo viên.");

            // Tạo profile giáo viên trước, chưa cấp tài khoản đăng nhập.
            // Username/PasswordHash sẽ được gán khi bấm "Gửi tài khoản".
            var user = new User
            {
                Username = null,
                PasswordHash = null,
                RoleId = teacherRole.RoleId,
                FullName = dto.FullName,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                Address = dto.Address,
                AccountStatus = "NoAccount",
                IsAccountSent = false
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var teacher = new Teacher
            {
                UserId = user.UserId,
                Specialization = dto.Specialization,
                Degree = dto.Degree
            };

            _context.Teachers.Add(teacher);
            await _context.SaveChangesAsync();

            return new TeacherDto
            {
                TeacherId = teacher.UserId,
                UserId = user.UserId,
                Username = user.Username,
                FullName = user.FullName ?? "",
                Email = user.Email ?? "",
                PhoneNumber = user.PhoneNumber,
                Specialization = teacher.Specialization ?? "",
                Degree = teacher.Degree,
                AccountStatus = user.AccountStatus,
                ClassesCount = 0,
                CreatedAt = DateTime.Now
            };
        }

        public async Task<bool> UpdateTeacherAsync(int id, UpdateTeacherDto dto)
        {
            var teacher = await _context.Teachers
                .Include(t => t.TeacherNavigation)
                .FirstOrDefaultAsync(t => t.UserId == id);

            if (teacher == null)
                return false;

            if (!string.IsNullOrEmpty(dto.FullName))
                teacher.TeacherNavigation.FullName = dto.FullName;

            if (!string.IsNullOrEmpty(dto.Email))
            {
                var emailExists = await _context.Users
                    .AnyAsync(u => u.Email == dto.Email && u.UserId != teacher.UserId);

                if (emailExists)
                    throw new Exception("Email đã tồn tại.");

                teacher.TeacherNavigation.Email = dto.Email;
            }

            if (dto.PhoneNumber != null)
                teacher.TeacherNavigation.PhoneNumber = dto.PhoneNumber;

            if (dto.Address != null)
                teacher.TeacherNavigation.Address = dto.Address;

            if (!string.IsNullOrEmpty(dto.Specialization))
                teacher.Specialization = dto.Specialization;

            if (dto.Degree != null)
                teacher.Degree = dto.Degree;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteTeacherAsync(int id)
        {
            var teacher = await _context.Teachers
                .Include(t => t.TeacherNavigation)
                .FirstOrDefaultAsync(t => t.UserId == id);

            if (teacher == null)
                return false;

            var hasClasses = await _context.Classes
                .AnyAsync(c => c.TeacherId == id);

            if (hasClasses)
                throw new Exception("Không thể xóa giáo viên: giáo viên đã được phân công lớp học.");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Teachers.Remove(teacher);
                _context.Users.Remove(teacher.TeacherNavigation);
                
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

        public async Task<object> GetTeacherClassesAsync(int id)
        {
            var teacher = await _context.Teachers
                .Include(t => t.TeacherNavigation)
                .FirstOrDefaultAsync(t => t.UserId == id);

            if (teacher == null)
                return new { message = "Không tìm thấy giáo viên" };

            var classes = await _context.Classes
                .Include(c => c.Grade)
                .Where(c => c.TeacherId == id)
                .Select(c => new
                {
                    c.ClassId,
                    c.ClassName,
                    c.Description,
                    c.Status,
                    c.StartDate,
                    c.EndDate,
                    SubjectName = c.Subject != null ? c.Subject.SubjectName : "",
                    GradeName = c.Grade != null ? c.Grade.GradeName : "",
                    TeacherName = teacher.TeacherNavigation.FullName ?? "",
                    AssistantName = c.Assistant != null ? c.Assistant.AssistantNavigation.FullName : "",
                    StudentCount = c.Students.Count,
                    MaxStudents = c.MaxStudents,
                    TotalSessions = c.Sessions.Count,
                    CompletedSessions = c.Sessions.Count(s => s.Status == "Completed" || s.SessionDate < DateTime.Now),
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

public async Task<bool> SendAccountAsync(int teacherId)
        {
            var teacher = await _context.Teachers
                .Include(t => t.TeacherNavigation)
                .FirstOrDefaultAsync(t => t.UserId == teacherId);

            if (teacher == null)
                throw new Exception("Không tìm thấy giáo viên.");

            var user = teacher.TeacherNavigation;

            if (string.IsNullOrWhiteSpace(user.Email))
                throw new Exception("Giáo viên chưa có email. Vui lòng cập nhật email trước khi gửi tài khoản.");

            // Chỉ khi gửi tài khoản mới gán username/password.
            // Username bắt buộc = email (bao gồm @)
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
            user.IsAccountSent = true;

            await _context.SaveChangesAsync();

            // Send email with the EXACT password
            await _mailService.SendTeacherAccount(user.Email, user.Username, newPassword);

            return true;
        }
    }
}