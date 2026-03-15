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
                    Username = s.UserId.HasValue 
                        ? (s.StudentNavigation?.Username ?? "") 
                        : "NO_ACCOUNT",  // Indicator
                    FullName = s.UserId.HasValue 
                        ? (s.StudentNavigation?.FullName ?? "") 
                        : (s.FullName ?? ""),  // Dùng FullName từ Student
                    Email = s.Email ?? "",
                    PhoneNumber = s.UserId.HasValue 
                        ? s.StudentNavigation?.PhoneNumber
                        : null,
                   Address = s.UserId.HasValue 
                        ? s.StudentNavigation?.Address
                        : null,
                    Grade = s.Grade,
                    EnrollmentStatus = s.EnrollmentStatus ?? "Active",
                    AccountStatus = s.UserId.HasValue 
                        ? (s.StudentNavigation?.AccountStatus ?? "Unknown") 
                        : "NO_ACCOUNT",
                    IsAccountSent = s.UserId.HasValue 
                        ? (s.StudentNavigation?.IsAccountSent ?? false) 
                        : false,
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
                    Username = s.UserId.HasValue 
                        ? (s.StudentNavigation?.Username ?? "") 
                        : "NO_ACCOUNT",
                    FullName = s.UserId.HasValue 
                        ? (s.StudentNavigation?.FullName ?? "") 
                        : (s.FullName ?? ""),
                    Email = s.Email ?? "",
                    PhoneNumber = s.UserId.HasValue 
                        ? s.StudentNavigation?.PhoneNumber
                        : null,
                    Address = s.UserId.HasValue 
                        ? s.StudentNavigation?.Address
                        : null,
                    Grade = s.Grade,
                    EnrollmentStatus = s.EnrollmentStatus ?? "Active",
                    AccountStatus = s.UserId.HasValue 
                        ? (s.StudentNavigation?.AccountStatus ?? "Unknown") 
                        : "NO_ACCOUNT",
                    IsAccountSent = s.UserId.HasValue 
                        ? (s.StudentNavigation?.IsAccountSent ?? false) 
                        : false,
                    CreatedAt = DateTime.Now
                })
                .FirstOrDefaultAsync();
        }

        public async Task<StudentDto> CreateStudentAsync(CreateStudentDto dto)
        {
            // 1. Validate base required fields
            await ValidateBaseStudentData(dto);

            // 2. Check duplicate email (luôn luôn check)
            var existingStudent = await _context.Students
                .AnyAsync(s => s.Email == dto.Email);
            if (existingStudent)
                throw new Exception("Email already exists");

            // 3. Branch logic dựa trên username/password
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            {
                // MODE: Student không có account
                return await CreateStudentProfileOnly(dto);
            }
            else
            {
                // MODE: Student có account
                return await CreateStudentWithAccount(dto);
            }
        }

        private async Task<StudentDto> CreateStudentProfileOnly(CreateStudentDto dto)
        {
            // 1. Validate chỉ cần profile info
            if (string.IsNullOrWhiteSpace(dto.Email))
                throw new Exception("Email is required for student profile");

            // 2. Tạo chỉ Student record
            var student = new Student
            {
                UserId = null,  // Explicit null
                FullName = dto.FullName,  // Lưu tên vào Student
                Email = dto.Email,
                EnrollmentStatus = dto.EnrollmentStatus ?? "Active",
                Grade = dto.Grade,
                DateOfBirth = dto.DateOfBirth,
                Gender = dto.Gender
            };

            _context.Students.Add(student);
            await _context.SaveChangesAsync();

            // 3. Return DTO với thông tin phù hợp
            return new StudentDto
            {
                UserId = null,  // Explicit null
                Username = "NO_ACCOUNT",  // Indicator cho frontend
                FullName = student.FullName,  // Dùng tên từ Student
                Email = student.Email,
                PhoneNumber = dto.PhoneNumber,
                Address = null,
                Grade = student.Grade,
                EnrollmentStatus = student.EnrollmentStatus ?? "Active",
                AccountStatus = "NO_ACCOUNT",  // Custom status
                IsAccountSent = false,
                CreatedAt = DateTime.Now
            };
        }

        private async Task<StudentDto> CreateStudentWithAccount(CreateStudentDto dto)
        {
            // 1. Validate account info
            if (string.IsNullOrWhiteSpace(dto.Username))
                throw new Exception("Username is required for account creation");
            
            if (string.IsNullOrWhiteSpace(dto.Password))
                throw new Exception("Password is required for account creation");

            // 2. Check duplicate username
            var existingUser = await _context.Users
                .AnyAsync(u => u.Username == dto.Username);
            if (existingUser)
                throw new Exception("Username already exists");

            // 3. Get student role
            var studentRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.RoleName == "Student");
            if (studentRole == null)
                throw new Exception("Student role not found");

            // 4. Create User account
            var user = new User
            {
                Username = dto.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                RoleId = studentRole.RoleId,
                FullName = dto.FullName,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                AccountStatus = "Inactive", // Inactive until admin sends account
                IsAccountSent = false
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // 5. Create Student record linked to User
            var student = new Student
            {
                UserId = user.UserId,  // Liên kết với User
                Email = dto.Email,
                EnrollmentStatus = dto.EnrollmentStatus ?? "Active",
                Grade = dto.Grade,
                DateOfBirth = dto.DateOfBirth,
                Gender = dto.Gender
            };

            _context.Students.Add(student);
            await _context.SaveChangesAsync();

            // 6. Return DTO
            return new StudentDto
            {
                UserId = user.UserId,
                Username = user.Username,
                FullName = user.FullName ?? "",
                Email = student.Email,
                PhoneNumber = user.PhoneNumber,
                Address = user.Address,
                Grade = student.Grade,
                EnrollmentStatus = student.EnrollmentStatus ?? "Active",
                AccountStatus = user.AccountStatus,
                IsAccountSent = user.IsAccountSent,
                CreatedAt = DateTime.Now
            };
        }

        private async Task ValidateBaseStudentData(CreateStudentDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FullName))
                throw new Exception("FullName is required");
            
            if (string.IsNullOrWhiteSpace(dto.Email))
                throw new Exception("Email is required");
            
            // Validate email format
            if (!IsValidEmail(dto.Email))
                throw new Exception("Invalid email format");
            
            // Validate phone format if provided
            if (!string.IsNullOrWhiteSpace(dto.PhoneNumber) && !IsValidPhone(dto.PhoneNumber))
                throw new Exception("Invalid phone number format");
        }

        private bool IsValidEmail(string email)
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
            }
        }

        private bool IsValidPhone(string phone)
        {
            // Basic phone validation - customize as needed
            return System.Text.RegularExpressions.Regex.IsMatch(phone, @"^[\d\s\-\+\(\)]+$");
        }

        public async Task<bool> UpdateStudentAsync(int id, UpdateStudentDto dto)
        {
            var student = await _context.Students
                .Include(s => s.StudentNavigation)
                .FirstOrDefaultAsync(s => s.UserId == id);

            if (student == null)
                return false;

            // Update Student fields
            if (!string.IsNullOrEmpty(dto.FullName))
            {
                if (student.UserId.HasValue && student.StudentNavigation != null)
                {
                    student.StudentNavigation.FullName = dto.FullName;
                }
                else
                {
                    student.FullName = dto.FullName;
                }
            }

            if (!string.IsNullOrEmpty(dto.Email))
            {
                var emailExists = await _context.Students
                    .AnyAsync(s => s.Email == dto.Email && s.UserId != id);

                if (emailExists)
                    throw new Exception("Email already exists");

                if (student.UserId.HasValue && student.StudentNavigation != null)
                {
                    student.StudentNavigation.Email = dto.Email;
                }
                student.Email = dto.Email;
            }

            if (dto.PhoneNumber != null)
            {
                if (student.UserId.HasValue && student.StudentNavigation != null)
                {
                    student.StudentNavigation.PhoneNumber = dto.PhoneNumber;
                }
            }

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
                
                // Chỉ xóa User nếu có liên kết
                if (student.UserId.HasValue && student.StudentNavigation != null)
                {
                    _context.Users.Remove(student.StudentNavigation);
                }
                
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
