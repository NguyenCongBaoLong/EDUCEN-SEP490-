using EducenAPI.DTOs.Students;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
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
            var students = await _context.Students
                .Include(s => s.StudentNavigation)
                .Include(s => s.Parents)
                    .ThenInclude(p => p.ParentNavigation)
                .Include(s => s.Classes)
                .ToListAsync();

            return students.Select(MapToStudentDto);
        }

        public async Task<StudentDto?> GetStudentByIdAsync(int id)
        {
            var student = await _context.Students
                .Include(s => s.StudentNavigation)
                .Include(s => s.Parents)
                    .ThenInclude(p => p.ParentNavigation)
                .Include(s => s.Classes)
                .FirstOrDefaultAsync(s => s.UserId == id);

            if (student != null && student.GradeId == null && !string.IsNullOrEmpty(student.Grade))
            {
                var grade = await _context.Grades.FirstOrDefaultAsync(g => g.GradeName == student.Grade);
                if (grade != null)
                {
                    student.GradeId = grade.GradeId;
                    await _context.SaveChangesAsync();
                }
            }

            return student != null ? MapToStudentDto(student) : null;
        }

        /// <summary>
        /// Maps a Student entity to StudentDto - refactored to eliminate duplicate code
        /// </summary>
        private static StudentDto MapToStudentDto(Student s)
        {
            // Since we always create User first, check StudentNavigation instead of UserId
            var hasUser = s.StudentNavigation != null;

            return new StudentDto
            {
                UserId = hasUser ? s.UserId : 0,
                Username = hasUser ? s.StudentNavigation.Username ?? "" : "NO_ACCOUNT",
                FullName = hasUser ? s.StudentNavigation.FullName ?? "" : "",
                Email = hasUser ? (s.StudentNavigation.Email ?? "") : "",
                PhoneNumber = hasUser ? s.StudentNavigation.PhoneNumber : null,
                Address = hasUser ? s.StudentNavigation.Address : null,
                Grade = s.Grade,
                GradeId = s.GradeId,
                DateOfBirth = s.DateOfBirth,
                Gender = s.Gender,
                EnrollmentStatus = s.EnrollmentStatus ?? "Active",
                AccountStatus = hasUser ? s.StudentNavigation!.AccountStatus : "NO_ACCOUNT",
                IsAccountSent = hasUser && s.StudentNavigation!.IsAccountSent,
                ClassName = s.Classes.FirstOrDefault()?.ClassName,
                CreatedAt = DateTime.Now,
                ParentNames = s.Parents.Select(p => p.ParentNavigation?.FullName ?? p.ParentNavigation?.Username ?? "").ToList(),
                ParentIds = s.Parents.Select(p => p.UserId).ToList()
            };
        }

        public async Task<StudentDto> CreateStudentAsync(CreateStudentDto dto)
        {
            try
            {
                dto.PhoneNumber = dto.PhoneNumber?.Trim();
                dto.Username = dto.Username?.Trim();

                // 1. Validate base required fields
                ValidateBaseStudentData(dto);

                // 2. Check duplicate email (check toàn bộ bảng Users)
                var existingUserEmail = await _context.Users
                    .AnyAsync(u => u.Email == dto.Email);
                if (existingUserEmail)
                    throw new Exception(ValidationMessages.DuplicateEmail);

                // 3. Branch logic dựa trên username/password
                if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
                {
                    return await CreateStudentProfileOnly(dto);
                }
                else
                {
                    return await CreateStudentWithAccount(dto);
                }
            }
            catch (Exception ex)
            {
                // Log chi tiết lỗi để debug
                var errorMessage = ex.Message;
                if (ex.InnerException != null)
                {
                    errorMessage += " | Inner: " + ex.InnerException.Message;
                }
                throw new Exception(errorMessage);
            }
        }

        private async Task<StudentDto> CreateStudentProfileOnly(CreateStudentDto dto)
        {
            // 1. Validate chỉ cần profile info
            if (string.IsNullOrWhiteSpace(dto.Email))
                throw new Exception(ValidationMessages.RequiredEmail);

            // 2. Lấy student role
            var studentRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.RoleName == "Student");
            if (studentRole == null)
                throw new Exception("Không tìm thấy vai trò Học sinh.");

            // 3. Tạo User với null username/password (không có account)
            var user = new User
            {
                Username = dto.Username,  // Giữ lại username nếu có (từ import hoặc form)
                PasswordHash = null,  // Không có password
                RoleId = studentRole.RoleId,
                FullName = dto.FullName,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                Address = dto.Address,
                AccountStatus = "NoAccount",
                IsAccountSent = false
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // 4. Tạo Student record với UserId
            var student = new Student
            {
                UserId = user.UserId,  // Liên kết với User đã tạo
                Email = dto.Email,
                EnrollmentStatus = dto.EnrollmentStatus ?? "Active",
                Grade = dto.Grade,
                DateOfBirth = dto.DateOfBirth,
                Gender = dto.Gender
            };

            if (!string.IsNullOrEmpty(dto.Grade))
            {
                var grade = await _context.Grades.FirstOrDefaultAsync(g => g.GradeName == dto.Grade);
                if (grade != null) student.GradeId = grade.GradeId;
            }

            _context.Students.Add(student);
            
            // 5. Link Parents
            if (dto.ParentIds != null && dto.ParentIds.Count > 0)
            {
                foreach (var parentId in dto.ParentIds)
                {
                    var parent = await _context.Parents.FindAsync(parentId);
                    if (parent != null)
                        student.Parents.Add(parent);
                }
            }

            await _context.SaveChangesAsync();

            // 6. Return DTO với thông tin phù hợp
            return MapToStudentDto(student);
        }

        private async Task<StudentDto> CreateStudentWithAccount(CreateStudentDto dto)
        {
            // 1. Validate account info
            if (string.IsNullOrWhiteSpace(dto.Username))
                throw new Exception(ValidationMessages.RequiredUsername);
            
            if (string.IsNullOrWhiteSpace(dto.Password))
                throw new Exception(ValidationMessages.RequiredPassword);

            // 2. Check duplicate username
            var existingUser = await _context.Users
                .AnyAsync(u => u.Username == dto.Username);
            if (existingUser)
                throw new Exception(ValidationMessages.DuplicateUsername);

            // 3. Get student role
            var studentRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.RoleName == "Student");
            if (studentRole == null)
                throw new Exception("Không tìm thấy vai trò Học sinh.");

            // 4. Create User account
            var user = new User
            {
                Username = dto.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                RoleId = studentRole.RoleId,
                FullName = dto.FullName,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                Address = dto.Address,
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

            if (!string.IsNullOrEmpty(dto.Grade))
            {
                var grade = await _context.Grades.FirstOrDefaultAsync(g => g.GradeName == dto.Grade);
                if (grade != null) student.GradeId = grade.GradeId;
            }

            _context.Students.Add(student);
            
            // 6. Link Parents
            if (dto.ParentIds != null && dto.ParentIds.Count > 0)
            {
                foreach (var parentId in dto.ParentIds)
                {
                    var parent = await _context.Parents.FindAsync(parentId);
                    if (parent != null)
                        student.Parents.Add(parent);
                }
            }

            await _context.SaveChangesAsync();

            // 7. Return DTO
            return MapToStudentDto(student);
        }

        private void ValidateBaseStudentData(CreateStudentDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FullName))
                throw new Exception(ValidationMessages.RequiredFullName);
            
            if (string.IsNullOrWhiteSpace(dto.Email))
                throw new Exception(ValidationMessages.RequiredEmail);
            
            // Validate email format
            if (!IsValidEmail(dto.Email))
                throw new Exception(ValidationMessages.InvalidEmailFormat);
            
            // Validate phone format if provided
            if (!string.IsNullOrWhiteSpace(dto.PhoneNumber) && !IsValidPhone(dto.PhoneNumber))
                throw new Exception(ValidationMessages.InvalidPhoneFormat);
            
            // Validate DateOfBirth - cannot be in the future
            if (dto.DateOfBirth.HasValue && dto.DateOfBirth.Value.Date > DateTime.Now.Date)
                throw new Exception(ValidationMessages.DateOfBirthInFuture);
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

            // Update Student fields (FullName chỉ có trong User, không có trong Student table)
            if (!string.IsNullOrEmpty(dto.FullName))
            {
                if (student.StudentNavigation != null)
                {
                    student.StudentNavigation.FullName = dto.FullName;
                }
            }

            if (!string.IsNullOrEmpty(dto.Email))
            {
                var emailExists = await _context.Users
                    .AnyAsync(u => u.Email == dto.Email && u.UserId != id);

                if (emailExists)
                    throw new Exception(ValidationMessages.DuplicateEmail);

                if (student.StudentNavigation != null)
                {
                    student.StudentNavigation.Email = dto.Email;
                }
                // Remove: student.Email = dto.Email;
            }

            if (dto.PhoneNumber != null)
            {
                if (student.StudentNavigation != null)
                {
                    student.StudentNavigation.PhoneNumber = dto.PhoneNumber;
                }
            }

            if (dto.EnrollmentStatus != null)
                student.EnrollmentStatus = dto.EnrollmentStatus;

            if (dto.Grade != null)
            {
                student.Grade = dto.Grade;
                var grade = await _context.Grades.FirstOrDefaultAsync(g => g.GradeName == dto.Grade);
                if (grade != null) student.GradeId = grade.GradeId;
            }

            if (dto.DateOfBirth.HasValue)
            {
                // Validate: DOB cannot be in the future
                if (dto.DateOfBirth.Value.Date > DateTime.Now.Date)
                    throw new Exception(ValidationMessages.DateOfBirthInFuture);
                
                student.DateOfBirth = dto.DateOfBirth;
            }

            if (dto.Gender != null)
            {
                student.Gender = dto.Gender;
            }

            if (dto.Address != null)
            {
                if (student.StudentNavigation != null)
                {
                    student.StudentNavigation.Address = dto.Address;
                }
            }

            // Update Parents
            if (dto.ParentIds != null)
            {
                // Load existing parents
                await _context.Entry(student).Collection(s => s.Parents).LoadAsync();
                student.Parents.Clear();
                foreach (var parentId in dto.ParentIds)
                {
                    var parent = await _context.Parents.FindAsync(parentId);
                    if (parent != null)
                        student.Parents.Add(parent);
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteStudentAsync(int id)
        {
            var student = await _context.Students
                .Include(s => s.StudentNavigation)
                .Include(s => s.Classes)
                .Include(s => s.Attendances)
                .Include(s => s.Submissions)
                .FirstOrDefaultAsync(s => s.UserId == id);

            if (student == null)
                return false;

            if (student.Classes.Count != 0)
                throw new Exception("Không thể xóa học sinh: học sinh đang tham gia ít nhất một lớp học.");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Xóa các related data trước
                
                // 1. Xóa Submissions
                if (student.Submissions.Any())
                {
                    _context.Submissions.RemoveRange(student.Submissions);
                }
                
                // 2. Xóa Attendances
                if (student.Attendances.Any())
                {
                    _context.Attendances.RemoveRange(student.Attendances);
                }
                
                // 3. Xóa Student khỏi các Class (ClassStudent relationship)
                student.Classes.Clear();
                
                // 4. Xóa Parent-Student relationships
                var parentStudents = await _context.Set<Dictionary<string, object>>("ParentStudent")
                    .Where(ps => (int)ps["StudentsUserId"] == id)
                    .ToListAsync();
                if (parentStudents.Any())
                {
                    _context.Set<Dictionary<string, object>>("ParentStudent").RemoveRange(parentStudents);
                }
                
                // 5. Xóa Student
                _context.Students.Remove(student);
                
                // 6. Xóa User nếu có liên kết
                if (student.StudentNavigation != null)
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

        public async Task<StudentDto?> GetStudentProfileAsync(int userId)
        {
            return await GetStudentByIdAsync(userId);
        }

        public async Task<StudentPerformanceReportDto?> GetStudentPerformanceReportAsync(int studentUserId)
        {
            var student = await _context.Students
                .Include(s => s.StudentNavigation)
                .Include(s => s.Classes)
                    .ThenInclude(c => c.Teacher)
                        .ThenInclude(t => t.TeacherNavigation)
                .Include(s => s.Classes)
                    .ThenInclude(c => c.Subject)
                .FirstOrDefaultAsync(s => s.UserId == studentUserId);

            if (student == null) return null;

            var report = new StudentPerformanceReportDto
            {
                StudentId = student.UserId,
                StudentName = student.StudentNavigation?.FullName ?? student.StudentNavigation?.Username ?? "N/A",
                ClassSummaries = new List<StudentClassPerformanceSummaryDto>()
            };

            decimal totalGpaSum = 0;
            int gpaClassCount = 0;
            decimal totalAttendanceRateSum = 0;
            int attendanceClassCount = 0;
            int totalSubmissionsCount = 0;
            int totalAssignmentsCount = 0;

            foreach (var cls in student.Classes)
            {
                // Attendance
                var sessions = await _context.ClassSessions
                    .Where(cs => cs.ClassId == cls.ClassId)
                    .ToListAsync();

                var pastSessions = sessions.Where(s => s.SessionDate <= DateTime.Now).ToList();
                var attendanceRecords = await _context.Attendances
                    .Where(a => a.StudentId == studentUserId && pastSessions.Select(ps => ps.SessionId).Contains(a.SessionId))
                    .ToListAsync();

                int attended = attendanceRecords.Count(a => 
                    a.Status.ToLower() == "present" || 
                    a.Status.ToLower() == "attended" || 
                    a.Status.ToLower() == "có mặt");
                
                int totalPast = pastSessions.Count();
                decimal attRate = totalPast > 0 ? (decimal)attended / totalPast * 100 : 0;

                // Assignments & Grades
                var classAssignments = await _context.Assignments
                    .Where(a => a.Session.ClassId == cls.ClassId)
                    .Include(a => a.Submissions)
                    .ToListAsync();

                var mySubmissions = classAssignments
                    .SelectMany(a => a.Submissions)
                    .Where(sub => sub.StudentId == studentUserId)
                    .ToList();

                var publishedGrades = mySubmissions
                    .Where(sub => sub.Score != null && sub.IsPublished)
                    .ToList();

                decimal avgScore = publishedGrades.Any() ? publishedGrades.Average(s => s.Score!.Value) : 0;
                int submittedCount = mySubmissions.Count();
                int totalAsms = classAssignments.Count();

                // Latest Feedback
                var latestFeedback = publishedGrades
                    .OrderByDescending(s => s.GradedAt ?? s.SubmittedAt)
                    .Select(s => s.TeacherComment)
                    .FirstOrDefault(c => !string.IsNullOrWhiteSpace(c));

                // Ranking
                string rank = "—";
                if (publishedGrades.Any())
                {
                    rank = avgScore >= 9.0m ? "Xuất sắc" :
                           avgScore >= 8.0m ? "Giỏi" :
                           avgScore >= 6.5m ? "Khá" :
                           avgScore >= 5.0m ? "Trung bình" : "Yếu";
                }

                report.ClassSummaries.Add(new StudentClassPerformanceSummaryDto
                {
                    ClassId = cls.ClassId,
                    ClassName = cls.ClassName ?? "N/A",
                    SubjectName = cls.Subject?.SubjectName ?? "N/A",
                    TeacherName = cls.Teacher?.TeacherNavigation?.FullName ?? "N/A",
                    TotalSessionsPassed = totalPast,
                    AttendedSessions = attended,
                    AttendanceRate = Math.Round(attRate, 1),
                    TotalAssignments = totalAsms,
                    SubmittedAssignments = submittedCount,
                    AverageScore = publishedGrades.Any() ? Math.Round(avgScore, 1) : null,
                    LatestFeedback = latestFeedback,
                    Rank = rank,
                    Status = cls.Status ?? "Active"
                });

                if (publishedGrades.Any())
                {
                    totalGpaSum += avgScore;
                    gpaClassCount++;
                }

                if (totalPast > 0)
                {
                    totalAttendanceRateSum += attRate;
                    attendanceClassCount++;
                }

                totalSubmissionsCount += submittedCount;
                totalAssignmentsCount += totalAsms;
            }

            report.OverallGPA = gpaClassCount > 0 ? Math.Round(totalGpaSum / gpaClassCount, 1) : 0;
            report.OverallAttendanceRate = attendanceClassCount > 0 ? Math.Round(totalAttendanceRateSum / attendanceClassCount, 1) : 0;
            report.TotalAssignmentsSubmitted = totalSubmissionsCount;
            report.TotalAssignmentsAssigned = totalAssignmentsCount;

            return report;
        }
    }
}
