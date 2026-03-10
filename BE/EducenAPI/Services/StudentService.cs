using EducenAPI.DTOs.Students;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class StudentService : IStudentService
    {
        private readonly EducenV2Context _context;

        public StudentService(EducenV2Context context)
        {
            _context = context;
        }

        public async Task<IEnumerable<StudentDto>> GetAllStudentsAsync()
        {
            return await _context.Students
                .Include(s => s.StudentNavigation)
                .Select(s => new StudentDto
                {
                    UserId = s.UserId,
                    Username = s.StudentNavigation.Username,
                    FullName = s.StudentNavigation.FullName ?? "",
                    Email = s.Email ?? "",
                    PhoneNumber = s.StudentNavigation.PhoneNumber,
                   Address = s.StudentNavigation.Address,
                    Grade = s.Grade,
                    EnrollmentStatus = s.EnrollmentStatus ?? "Active",
                    AccountStatus = s.StudentNavigation.AccountStatus,
                    IsAccountSent = s.StudentNavigation.IsAccountSent,
                    CreatedAt = DateTime.Now
                })
                .ToListAsync();
        }

        public async Task<StudentDto?> GetStudentByIdAsync(int id)
        {
            return await _context.Students
                .Include(s => s.StudentNavigation)
                .Where(s => s.UserId == id)
                .Select(s => new StudentDto
                {
                    UserId = s.UserId,
                    Username = s.StudentNavigation.Username,
                    FullName = s.StudentNavigation.FullName ?? "",
                    Email = s.Email ?? "",
                    PhoneNumber = s.StudentNavigation.PhoneNumber,
                    Address = s.StudentNavigation.Address,
                    Grade = s.Grade,
                    EnrollmentStatus = s.EnrollmentStatus ?? "Active",
                    AccountStatus = s.StudentNavigation.AccountStatus,
                    IsAccountSent = s.StudentNavigation.IsAccountSent,
                    CreatedAt = DateTime.Now
                })
                .FirstOrDefaultAsync();
        }

        public async Task<StudentDto> CreateStudentAsync(CreateStudentDto dto)
        {
            var existingUser = await _context.Users
                .AnyAsync(u => u.Username == dto.Username);

            if (existingUser)
                throw new Exception("Username already exists");

            var existingStudent = await _context.Students
                .AnyAsync(s => s.Email == dto.Email);

            if (existingStudent)
                throw new Exception("Email already exists");

            var studentRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.RoleName == "Student");

            if (studentRole == null)
                throw new Exception("Student role not found");

            var user = new User
            {
                Username = dto.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                RoleId = studentRole.RoleId,
                FullName = dto.FullName,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                AccountStatus = "Inactive", // Inactive until admin sends account via email
                IsAccountSent = false
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var student = new Student
            {
                UserId = user.UserId,
                Email = dto.Email,
                EnrollmentStatus = dto.EnrollmentStatus ?? "Active",
                Grade = dto.Grade,
                DateOfBirth = dto.DateOfBirth,
                Gender = dto.Gender
            };

            _context.Students.Add(student);
            await _context.SaveChangesAsync();

            return new StudentDto
            {
                UserId = user.UserId,
                Username = user.Username,
                FullName = user.FullName ?? "",
                Email = student.Email,
                PhoneNumber = user.PhoneNumber,
                Grade = student.Grade,
                EnrollmentStatus = student.EnrollmentStatus ?? "Active",
                AccountStatus = user.AccountStatus,
                IsAccountSent = user.IsAccountSent,
                CreatedAt = DateTime.Now
            };
        }

        public async Task<bool> UpdateStudentAsync(int id, UpdateStudentDto dto)
        {
            var student = await _context.Students
                .Include(s => s.StudentNavigation)
                .FirstOrDefaultAsync(s => s.UserId == id);

            if (student == null)
                return false;

            if (!string.IsNullOrEmpty(dto.FullName))
                student.StudentNavigation.FullName = dto.FullName;

            if (!string.IsNullOrEmpty(dto.Email))
            {
                var emailExists = await _context.Students
                    .AnyAsync(s => s.Email == dto.Email && s.UserId != id);

                if (emailExists)
                    throw new Exception("Email already exists");

                student.StudentNavigation.Email = dto.Email;
                student.Email = dto.Email;
            }

            if (dto.PhoneNumber != null)
                student.StudentNavigation.PhoneNumber = dto.PhoneNumber;

            if (dto.EnrollmentStatus != null)
                student.EnrollmentStatus = dto.EnrollmentStatus;

            if (dto.Grade != null)
                student.Grade = dto.Grade;

            if (dto.DateOfBirth.HasValue)
                student.DateOfBirth = dto.DateOfBirth;

            if (dto.Gender != null)
                student.Gender = dto.Gender;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteStudentAsync(int id)
        {
            var student = await _context.Students
                .Include(s => s.StudentNavigation)
                .Include(s => s.Classes)
                .FirstOrDefaultAsync(s => s.UserId == id);

            if (student == null)
                return false;

            if (student.Classes.Count != 0)
                throw new Exception("Cannot delete student: student is assigned to one or more classes");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Students.Remove(student);
                _context.Users.Remove(student.StudentNavigation);
                
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
