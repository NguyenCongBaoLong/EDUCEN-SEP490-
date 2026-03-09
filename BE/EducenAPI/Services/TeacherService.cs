using EducenAPI.DTOs.Teachers;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class TeacherService : ITeacherService
    {
        private readonly EducenV2Context _context;

        public TeacherService(EducenV2Context context)
        {
            _context = context;
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
                    Specialization = t.Specialization ?? "",
                    Degree = t.Degree,
                    AccountStatus = t.TeacherNavigation.AccountStatus,
                    ClassesCount = _context.Classes.Count(c => c.TeacherId == t.UserId),
                    CreatedAt = DateTime.Now
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
                    Specialization = t.Specialization ?? "",
                    Degree = t.Degree,
                    AccountStatus = t.TeacherNavigation.AccountStatus,
                    ClassesCount = t.Classes.Count,
                    CreatedAt = DateTime.Now
                })
                .FirstOrDefaultAsync();
        }

        public async Task<TeacherDto> CreateTeacherAsync(CreateTeacherDto dto)
        {
            // Skip user creation if username or password is null
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            {
                // Create teacher profile without user account
                var teacherProfile = new Teacher
                {
                    UserId = 0, // Will be set when account is created
                    Specialization = dto.Specialization,
                    Degree = dto.Degree
                };

                _context.Teachers.Add(teacherProfile);
                await _context.SaveChangesAsync();

                return new TeacherDto
                {
                    TeacherId = teacherProfile.UserId,
                    UserId = teacherProfile.UserId,
                    Username = "",
                    FullName = dto.FullName,
                    Email = dto.Email,
                    PhoneNumber = dto.PhoneNumber,
                    Specialization = teacherProfile.Specialization ?? "",
                    Degree = teacherProfile.Degree,
                    AccountStatus = "Pending",
                    ClassesCount = 0,
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

            var teacherRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.RoleName == "Teacher");

            if (teacherRole == null)
                throw new Exception("Teacher role not found");

            var user = new User
            {
                Username = dto.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                RoleId = teacherRole.RoleId,
                FullName = dto.FullName,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                AccountStatus = "Active"
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
                    throw new Exception("Email already exists");

                teacher.TeacherNavigation.Email = dto.Email;
            }

            if (dto.PhoneNumber != null)
                teacher.TeacherNavigation.PhoneNumber = dto.PhoneNumber;

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
                throw new Exception("Cannot delete teacher: teacher has assigned classes");

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
                .Include(t => t.Classes)
                .ThenInclude(c => c.Subject)
                .Include(t => t.Classes)
                .ThenInclude(c => c.Students)
                .FirstOrDefaultAsync(t => t.UserId == id);

            if (teacher == null)
                return new { message = "Teacher not found" };

            return teacher.Classes.Select(c => new
            {
                c.ClassId,
                c.ClassName,
                c.Description,
                c.Status,
                SubjectName = c.Subject.SubjectName,
                StudentCount = c.Students?.Count ?? 0
            }).ToList();
        }
    }
}
