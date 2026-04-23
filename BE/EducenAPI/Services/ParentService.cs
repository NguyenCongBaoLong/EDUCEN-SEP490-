using EducenAPI.DTOs.Parents;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class ParentService : IParentService
    {
        private readonly EducenV2Context _context;
        private readonly MailService _mailService;

        public ParentService(EducenV2Context context, MailService mailService)
        {
            _context = context;
            _mailService = mailService;
        }

        public async Task<IEnumerable<ParentDto>> GetAllParentsAsync()
        {
            var parents = await _context.Parents
                .Include(p => p.ParentNavigation)
                .Include(p => p.Students)
                    .ThenInclude(s => s.StudentNavigation)
                .AsNoTracking()
                .ToListAsync();

            var parentDtos = new List<ParentDto>();
            
            foreach (var p in parents)
            {
                var studentNames = new List<string>();
                var studentClassNames = new List<string>();
                var studentIds = new List<int>();
                
                foreach (var student in p.Students)
                {
                    studentIds.Add(student.UserId);
                    studentNames.Add(student.StudentNavigation?.FullName ?? student.StudentNavigation?.Username ?? "");
                }
                
                parentDtos.Add(new ParentDto
                {
                    ParentId = p.UserId,
                    UserId = p.UserId,
                    Username = p.ParentNavigation?.Username ?? "",
                    FullName = p.ParentNavigation?.FullName ?? "",
                    Email = p.ParentNavigation?.Email ?? "",
                    PhoneNumber = p.ParentNavigation?.PhoneNumber,
                    Address = p.ParentNavigation?.Address,
                    AccountStatus = p.ParentNavigation?.AccountStatus,
                    ChildrenCount = p.Students.Count,
                    StudentNames = studentNames,
                    StudentClassNames = studentClassNames,
                    StudentIds = studentIds,
                    CreatedAt = DateTime.Now
                });
            }

            return parentDtos;
        }

        public async Task<ParentDto?> GetParentByIdAsync(int id)
        {
            var parent = await _context.Parents
                .Include(p => p.ParentNavigation)
                .Include(p => p.Students)
                    .ThenInclude(s => s.StudentNavigation)
                .Include(p => p.Students)
                    .ThenInclude(s => s.Classes)
                .Where(p => p.UserId == id)
                .Select(p => new ParentDto
                {
                    ParentId = p.UserId,
                    UserId = p.UserId,
                    Username = p.ParentNavigation.Username ?? "",
                    FullName = p.ParentNavigation.FullName ?? "",
                    Email = p.ParentNavigation.Email ?? "",
                    PhoneNumber = p.ParentNavigation.PhoneNumber,
                    Address = p.ParentNavigation.Address,
                    AccountStatus = p.ParentNavigation.AccountStatus,
                    ChildrenCount = p.Students.Count,
                    StudentNames = p.Students.Select(s => s.StudentNavigation != null ? (s.StudentNavigation.FullName ?? s.StudentNavigation.Username ?? "") : "").ToList(),
                    StudentClassNames = p.Students.Select(s => s.Classes.FirstOrDefault() != null ? (s.Classes.FirstOrDefault()!.ClassName ?? "Chưa xếp lớp") : "Chưa xếp lớp").ToList(),
                    StudentIds = p.Students.Select(s => s.UserId).ToList(),
                    CreatedAt = DateTime.Now
                })
                .FirstOrDefaultAsync();

            return parent;
        }

        public async Task<ParentDto> CreateParentAsync(CreateParentDto dto)
        {
            dto.Username = dto.Username?.Trim();
            dto.Email = dto.Email?.Trim()?.ToLower();
            dto.FullName = dto.FullName?.Trim();

            string? username = dto.Username;
            string? password = dto.Password;
            string accountStatus = "Active";

            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                username = null;
                password = null;
                accountStatus = "NoAccount";
            }

            if (username != null)
            {
                var existingUser = await _context.Users
                    .AnyAsync(u => u.Username == username);

                if (existingUser)
                    throw new Exception("Tên đăng nhập đã tồn tại");
            }

            var existingEmail = await _context.Users
                .AnyAsync(u => u.Email == dto.Email);

            if (existingEmail)
                throw new Exception("Email đã tồn tại");

            var parentRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.RoleName == "Parent");

            if (parentRole == null)
                throw new Exception("Không tìm thấy vai trò phụ huynh");

            var user = new User
            {
                Username = username,
                PasswordHash = password != null ? BCrypt.Net.BCrypt.HashPassword(password) : null,
                RoleId = parentRole.RoleId,
                FullName = dto.FullName,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                Address = dto.Address,
                AccountStatus = accountStatus,
                IsAccountSent = false
            };

            var parent = new Parent
            {
                ParentNavigation = user
            };

            // Link Students
            if (dto.StudentIds != null && dto.StudentIds.Any())
            {
                var students = await _context.Students
                    .Include(s => s.StudentNavigation)
                    .Where(s => dto.StudentIds.Contains(s.UserId))
                    .ToListAsync();
                foreach (var student in students)
                {
                    parent.Students.Add(student);
                }
            }

            _context.Users.Add(user);
            _context.Parents.Add(parent);
            await _context.SaveChangesAsync();

            return new ParentDto
            {
                ParentId = parent.UserId,
                UserId = user.UserId,
                Username = user.Username ?? "",
                FullName = user.FullName ?? "",
                Email = user.Email ?? "",
                PhoneNumber = user.PhoneNumber,
                Address = user.Address,
                AccountStatus = user.AccountStatus,
                ChildrenCount = parent.Students.Count,
                StudentNames = parent.Students.Select(s => s.StudentNavigation != null ? (s.StudentNavigation.FullName ?? s.StudentNavigation.Username ?? "") : "").ToList(),
                StudentClassNames = parent.Students.Select(s => s.Classes.FirstOrDefault() != null ? (s.Classes.FirstOrDefault()!.ClassName ?? "Chưa xếp lớp") : "Chưa xếp lớp").ToList(),
                StudentIds = parent.Students.Select(s => s.UserId).ToList(),
                CreatedAt = DateTime.Now
            };
        }

        public async Task<bool> UpdateParentAsync(int id, UpdateParentDto dto)
        {
            var existingParent = await _context.Parents
                .Include(p => p.ParentNavigation)
                .FirstOrDefaultAsync(p => p.UserId == id);

            if (existingParent == null)
                return false;

            // Update user info if exists
            if (existingParent.ParentNavigation != null)
            {
                if (!string.IsNullOrWhiteSpace(dto.Username))
                    existingParent.ParentNavigation.Username = dto.Username;

                if (!string.IsNullOrWhiteSpace(dto.Password))
                    existingParent.ParentNavigation.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

                if (!string.IsNullOrWhiteSpace(dto.FullName))
                    existingParent.ParentNavigation.FullName = dto.FullName;

                if (!string.IsNullOrWhiteSpace(dto.Email))
                {
                    var emailExists = await _context.Users
                        .AnyAsync(u => u.Email == dto.Email && u.UserId != id);

                    if (emailExists)
                        throw new Exception("Email đã tồn tại");

                    existingParent.ParentNavigation.Email = dto.Email;
                }

                if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
                    existingParent.ParentNavigation.PhoneNumber = dto.PhoneNumber;

                if (dto.Address != null)
                {
                    if (existingParent.ParentNavigation != null)
                    {
                        existingParent.ParentNavigation.Address = dto.Address;
                    }
                }

                // Update Linked Students
                if (dto.StudentIds != null)
                {
                    // Load existing links
                    await _context.Entry(existingParent).Collection(p => p.Students).LoadAsync();

                    existingParent.Students.Clear();
                    var students = await _context.Students
                        .Where(s => dto.StudentIds.Contains(s.UserId))
                        .ToListAsync();
                    foreach (var student in students)
                    {
                        existingParent.Students.Add(student);
                    }
                }

                await _context.SaveChangesAsync();
                return true;
            }

            return false;
        }

        public async Task<bool> DeleteParentAsync(int id)
        {
            var existingParent = await _context.Parents
                .Include(p => p.ParentNavigation)
                .FirstOrDefaultAsync(p => p.UserId == id);

            if (existingParent == null)
                return false;

            if (existingParent.ParentNavigation != null)
                _context.Users.Remove(existingParent.ParentNavigation);

            _context.Parents.Remove(existingParent);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SendAccountAsync(int parentId)
        {
            var user = await _context.Users
                .Include(u => u.Parent)
                .FirstOrDefaultAsync(u => u.UserId == parentId);

            if (user == null) return false;

            if (string.IsNullOrEmpty(user.Email))
                throw new Exception("Phụ huynh chưa có địa chỉ email");

            // Generate Username if not exists
            if (string.IsNullOrEmpty(user.Username))
            {
                user.Username = user.Email;
            }

            // Generate Secure Password
            string newPassword = PasswordGenerator.GenerateSecurePassword();
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            
            user.AccountStatus = "Active";
            user.IsAccountSent = true;

            await _context.SaveChangesAsync();

            // Send Email
            await _mailService.SendParentAccount(user.Email, user.Username, newPassword);

            return true;
        }
        public async Task<IEnumerable<ChildInfoDto>> GetMyChildrenAsync(int parentUserId)
        {
            var parent = await _context.Parents
                .Include(p => p.Students)
                    .ThenInclude(s => s.StudentNavigation)
                .Where(p => p.UserId == parentUserId)
                .FirstOrDefaultAsync();

            if (parent == null) return Enumerable.Empty<ChildInfoDto>();

            return parent.Students.Select(s => new ChildInfoDto
            {
                StudentId = s.UserId,
                FullName = s.StudentNavigation?.FullName ?? s.StudentNavigation?.Username ?? "",
                Username = s.StudentNavigation?.Username,
                Grade = s.Grade,
                Gender = s.Gender,
                EnrollmentStatus = s.EnrollmentStatus
            }).ToList();
        }

        public async Task<ChildPerformanceReportDto?> GetChildPerformanceReportAsync(int childId, int? month = null, int? year = null)
        {
            var student = await _context.Students
                .Include(s => s.StudentNavigation)
                .Include(s => s.Classes)
                    .ThenInclude(c => c.Teacher)
                        .ThenInclude(t => t.TeacherNavigation)
                .Include(s => s.Classes)
                    .ThenInclude(c => c.Subject)
                .FirstOrDefaultAsync(s => s.UserId == childId);

            if (student == null) return null;

            var report = new ChildPerformanceReportDto
            {
                StudentId = student.UserId,
                ChildName = student.StudentNavigation?.FullName ?? student.StudentNavigation?.Username ?? "N/A",
                ClassSummaries = new List<ClassPerformanceSummaryDto>()
            };

            decimal totalGpaSum = 0;
            int gpaClassCount = 0;
            decimal totalAttendanceRateSum = 0;
            int attendanceClassCount = 0;
            int totalSubmissionsCount = 0;
            int totalAssignmentsCount = 0;

            DateTime now = DateTime.Now;
            bool isMonthly = month.HasValue && year.HasValue;

            foreach (var cls in student.Classes)
            {
                // Attendance
                var sessionsQuery = _context.ClassSessions
                    .Where(cs => cs.ClassId == cls.ClassId && cs.SessionDate <= now);
                
                if (isMonthly)
                {
                    sessionsQuery = sessionsQuery.Where(s => s.SessionDate.Month == month && s.SessionDate.Year == year);
                }

                var pastSessions = await sessionsQuery.ToListAsync();
                var pastSessionIds = pastSessions.Select(ps => ps.SessionId).ToList();

                var attendanceRecords = await _context.Attendances
                    .Where(a => a.StudentId == childId && pastSessionIds.Contains(a.SessionId))
                    .ToListAsync();

                int attended = attendanceRecords.Count(a => 
                    a.Status.ToLower() == "present" || 
                    a.Status.ToLower() == "attended" || 
                    a.Status.ToLower() == "có mặt");
                
                int totalPast = pastSessions.Count();
                decimal attRate = totalPast > 0 ? (decimal)attended / totalPast * 100 : 0;

                // Assignments & Grades
                var assignmentsQuery = _context.Assignments
                    .Include(a => a.Session)
                    .Where(a => a.Session.ClassId == cls.ClassId);

                if (isMonthly)
                {
                    assignmentsQuery = assignmentsQuery.Where(a => a.Session.SessionDate.Month == month && a.Session.SessionDate.Year == year);
                }

                var classAssignments = await assignmentsQuery
                    .Include(a => a.Submissions)
                    .ToListAsync();

                var mySubmissions = classAssignments
                    .SelectMany(a => a.Submissions)
                    .Where(sub => sub.StudentId == childId)
                    .ToList();

                var publishedGrades = mySubmissions
                    .Where(sub => sub.Score != null && sub.IsPublished)
                    .ToList();

                decimal avgScore = publishedGrades.Any() ? publishedGrades.Average(s => s.Score!.Value) : 0;
                int submittedCount = mySubmissions.Count();
                int totalAsms = classAssignments.Count();

                // Latest Feedback - ordered by session date to get the truly latest in that month
                var latestFeedback = classAssignments
                    .OrderByDescending(a => a.Session.SessionDate)
                    .SelectMany(a => a.Submissions)
                    .Where(sub => sub.StudentId == childId && sub.IsPublished && !string.IsNullOrWhiteSpace(sub.TeacherComment))
                    .Select(sub => sub.TeacherComment)
                    .FirstOrDefault();

                // Ranking
                string rank = "—";
                if (publishedGrades.Any())
                {
                    rank = avgScore >= 9.0m ? "Xuất sắc" :
                           avgScore >= 8.0m ? "Giỏi" :
                           avgScore >= 6.5m ? "Khá" :
                           avgScore >= 5.0m ? "Trung bình" : "Yếu";
                }

                report.ClassSummaries.Add(new ClassPerformanceSummaryDto
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
