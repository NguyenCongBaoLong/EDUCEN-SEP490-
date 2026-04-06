using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class AttendanceService : IAttendanceService
    {
        private readonly EducenV2Context _context;
        private readonly ILogger<AttendanceService> _logger;
        private readonly IPaymentReminderService _notificationService;

        public AttendanceService(EducenV2Context context, ILogger<AttendanceService> logger, IPaymentReminderService notificationService)
        {
            _context = context;
            _logger = logger;
            _notificationService = notificationService;
        }

        public async Task<IEnumerable<Attendance>> GetAttendanceBySessionAsync(int sessionId)
        {
            return await _context.Attendances
                .Include(a => a.Student)
                    .ThenInclude(s => s.StudentNavigation)
                .Where(a => a.SessionId == sessionId)
                .ToListAsync();
        }

        public async Task<Attendance?> GetAttendanceByIdAsync(int attendanceId)
        {
            return await _context.Attendances
                .Include(a => a.Student)
                    .ThenInclude(s => s.StudentNavigation)
                .Include(a => a.UpdatedBy)
                .FirstOrDefaultAsync(a => a.AttendanceId == attendanceId);
        }

        public async Task<IEnumerable<Attendance>> GetAttendanceByStudentAsync(int studentId)
        {
            return await _context.Attendances
                .Include(a => a.Session)
                    .ThenInclude(s => s.Schedule)
                        .ThenInclude(sc => sc.Class)
                .Where(a => a.StudentId == studentId)
                .OrderByDescending(a => a.Session.SessionDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<Attendance>> GetAttendanceByClassAsync(int classId)
        {
            var sessions = await _context.ClassSessions
                .Where(s => s.ClassId == classId)
                .Select(s => s.SessionId)
                .ToListAsync();

            return await _context.Attendances
                .Include(a => a.Student)
                    .ThenInclude(s => s.StudentNavigation)
                .Where(a => sessions.Contains(a.SessionId))
                .OrderByDescending(a => a.Session.SessionDate)
                .ToListAsync();
        }

        public async Task<Attendance> CreateOrUpdateAttendanceAsync(int sessionId, int studentId, string status, int updatedByUserId)
        {
            ValidateStatus(status);

            var existing = await _context.Attendances
                .Include(a => a.Session)
                .FirstOrDefaultAsync(a => a.SessionId == sessionId && a.StudentId == studentId);

            var updater = await _context.Users.FindAsync(updatedByUserId);

            if (existing != null)
            {
                ValidateAttendanceModification(existing);

                existing.Status = status;
                existing.RecordedAt = DateTime.UtcNow;
                existing.UpdatedBy = updater;
            }
            else
            {
                var newAttendance = new Attendance
                {
                    SessionId = sessionId,
                    StudentId = studentId,
                    Status = status,
                    RecordedAt = DateTime.UtcNow,
                    UpdatedBy = updater
                };
                _context.Attendances.Add(newAttendance);
            }

            await _context.SaveChangesAsync();

            return existing ?? await _context.Attendances
                .FirstAsync(a => a.SessionId == sessionId && a.StudentId == studentId);
        }

        public async Task<IEnumerable<Attendance>> BulkSaveAttendanceAsync(int sessionId, List<AttendanceRecord> records, int updatedByUserId)
        {
            var session = await _context.ClassSessions.FindAsync(sessionId);
            if (session == null)
                throw new Exception("Không tìm thấy buổi học");

            ValidateSessionForAttendance(session);

            var existingAttendances = await _context.Attendances
                .Where(a => a.SessionId == sessionId)
                .ToListAsync();

            var updater = await _context.Users.FindAsync(updatedByUserId);

            foreach (var record in records)
            {
                ValidateStatus(record.Status);

                var existing = existingAttendances.FirstOrDefault(a => a.StudentId == record.StudentId);
                
                if (existing != null)
                {
                    existing.Status = record.Status;
                    existing.RecordedAt = DateTime.UtcNow;
                    existing.UpdatedBy = updater;
                }
                else
                {
                    var newAttendance = new Attendance
                    {
                        SessionId = sessionId,
                        StudentId = record.StudentId,
                        Status = record.Status,
                        RecordedAt = DateTime.UtcNow,
                        UpdatedBy = updater
                    };
                    _context.Attendances.Add(newAttendance);
                }
            }

            await _context.SaveChangesAsync();

            var studentIds = records.Select(r => r.StudentId).Distinct().ToList();
            var studentNames = await _context.Students
                .Include(s => s.StudentNavigation)
                .Where(s => studentIds.Contains(s.UserId))
                .ToDictionaryAsync(s => s.UserId, s => s.StudentNavigation?.FullName ?? "Học sinh");

            var className = await _context.Classes
                .Where(c => c.ClassId == session.ClassId)
                .Select(c => c.ClassName)
                .FirstOrDefaultAsync() ?? "";

            foreach (var record in records)
            {
                var studentName = studentNames.TryGetValue(record.StudentId, out var name) ? name : "Học sinh";
                await _notificationService.SendToParentsOfStudentAsync(record.StudentId, new CreateRoleNotificationRequest
                {
                    TenantId = _context.CurrentTenantId,
                    Title = "Cập nhật điểm danh",
                    Message = $"{studentName} đã được điểm danh '{record.Status}' cho buổi học ngày {session.SessionDate:dd/MM/yyyy} ({className}).",
                    Type = "Info",
                    Category = "Attendance",
                    ReferenceId = sessionId.ToString(),
                    ReferenceType = "ClassSession"
                });
            }

            return await _context.Attendances
                .Include(a => a.Student)
                    .ThenInclude(s => s.StudentNavigation)
                .Where(a => a.SessionId == sessionId)
                .ToListAsync();
        }

        public async Task<bool> UpdateAttendanceAsync(int attendanceId, string status, int updatedByUserId)
        {
            ValidateStatus(status);

            var attendance = await _context.Attendances
                .Include(a => a.Session)
                    .ThenInclude(s => s.Class)
                .Include(a => a.Student)
                    .ThenInclude(s => s.StudentNavigation)
                .FirstOrDefaultAsync(a => a.AttendanceId == attendanceId);

            if (attendance == null)
                return false;

            ValidateAttendanceModification(attendance);

            var updater = await _context.Users.FindAsync(updatedByUserId);
            attendance.Status = status;
            attendance.RecordedAt = DateTime.UtcNow;
            attendance.UpdatedBy = updater;

            await _context.SaveChangesAsync();

            await _notificationService.SendToParentsOfStudentAsync(attendance.StudentId, new CreateRoleNotificationRequest
            {
                TenantId = _context.CurrentTenantId,
                Title = "Cập nhật điểm danh",
                Message = $"{attendance.Student.StudentNavigation?.FullName} đã được điểm danh '{attendance.Status}' cho buổi học ngày {attendance.Session?.SessionDate:dd/MM/yyyy} ({attendance.Session?.Class?.ClassName}).",
                Type = "Info",
                Category = "Attendance",
                ReferenceId = attendance.SessionId.ToString(),
                ReferenceType = "ClassSession"
            });

            return true;
        }

        public async Task<AttendanceReportDto> GetClassAttendanceReportAsync(int classId)
        {
            var classEntity = await _context.Classes.FindAsync(classId);
            if (classEntity == null)
                throw new Exception("Không tìm thấy lớp học");

            var sessions = await _context.ClassSessions
                .Where(s => s.ClassId == classId)
                .ToListAsync();

            var sessionIds = sessions.Select(s => s.SessionId).ToList();
            var totalSessions = sessions.Count;

            var students = await _context.Students
                .Where(s => s.Classes.Any(c => c.ClassId == classId))
                .Include(s => s.StudentNavigation)
                .ToListAsync();

            var attendances = await _context.Attendances
                .Where(a => sessionIds.Contains(a.SessionId))
                .ToListAsync();

            var studentReports = new List<StudentAttendanceDto>();
            int totalPresent = 0;
            int totalAbsent = 0;

            foreach (var student in students)
            {
                var studentAttendance = attendances.Where(a => a.StudentId == student.UserId).ToList();
                var presentCount = studentAttendance.Count(a => a.Status == "present");
                var absentCount = studentAttendance.Count(a => a.Status == "absent");
                var notYetCount = studentAttendance.Count(a => a.Status == "notYet");

                totalPresent += presentCount;
                totalAbsent += absentCount;

                var totalRecorded = presentCount + absentCount;
                var rate = totalRecorded > 0 ? Math.Round((double)presentCount / totalRecorded * 100, 1) : 0;

                studentReports.Add(new StudentAttendanceDto
                {
                    StudentId = student.UserId,
                    StudentName = student.StudentNavigation?.FullName ?? "Unknown",
                    PresentCount = presentCount,
                    AbsentCount = absentCount,
                    NotYetCount = notYetCount,
                    AttendanceRate = rate
                });
            }

            var totalRecordedAll = totalPresent + totalAbsent;
            var overallRate = totalRecordedAll > 0 ? Math.Round((double)totalPresent / totalRecordedAll * 100, 1) : 0;

            return new AttendanceReportDto
            {
                ClassId = classId,
                ClassName = classEntity.ClassName,
                TotalSessions = totalSessions,
                TotalStudents = students.Count,
                AttendanceRate = overallRate,
                StudentReports = studentReports
            };
        }

        public async Task<IEnumerable<AttendanceSessionSummaryDto>> GetClassAttendanceSessionSummaryAsync(int classId)
        {
            var sessions = await _context.ClassSessions
                .Where(s => s.ClassId == classId)
                .ToListAsync();

            var sessionIds = sessions.Select(s => s.SessionId).ToList();

            var attendances = await _context.Attendances
                .Where(a => sessionIds.Contains(a.SessionId))
                .ToListAsync();

            var summary = sessions.Select(s => new AttendanceSessionSummaryDto
            {
                SessionId = s.SessionId,
                PresentCount = attendances.Count(a => a.SessionId == s.SessionId && a.Status == "present"),
                AbsentCount = attendances.Count(a => a.SessionId == s.SessionId && a.Status == "absent")
            }).ToList();

            return summary;
        }

        private static readonly HashSet<string> ValidStatuses = new() { "present", "absent", "notYet" };

        private static void ValidateStatus(string status)
        {
            if (!ValidStatuses.Contains(status))
                throw new Exception($"Trạng thái điểm danh không hợp lệ: '{status}'. Chỉ chấp nhận: present, absent, notYet.");
        }

        private void ValidateSessionForAttendance(ClassSession session)
        {
            // Sử dụng giờ Việt Nam (UTC+7)
            var now = DateTime.UtcNow.AddHours(7);
            var sessionDate = session.SessionDate.Date;
            var today = now.Date;
            var cutoffDate = today.AddDays(-2);

            if (sessionDate > today)
            {
                _logger.LogWarning("Attendance denied. Session {SessionId} is in future: {SessionDate}", session.SessionId, sessionDate);
                throw new Exception("Buổi học chưa diễn ra, chưa thể điểm danh");
            }

            if (sessionDate < cutoffDate)
            {
                _logger.LogWarning("Attendance denied. Session {SessionId} exceeds 2-day window. SessionDate: {SessionDate}, Today: {Today}", session.SessionId, sessionDate, today);
                throw new Exception("Chỉ được điểm danh trong vòng 2 ngày kể từ ngày học");
            }

            var schedule = _context.Schedules.Find(session.ScheduleId);
            if (schedule != null && sessionDate == today)
            {
                var sessionStart = sessionDate.Add(schedule.StartTime.ToTimeSpan());
                if (now < sessionStart)
                    throw new Exception("Buổi học chưa bắt đầu");
            }
        }

        private void ValidateAttendanceModification(Attendance attendance)
        {
            // Sử dụng giờ Việt Nam (UTC+7)
            var now = DateTime.UtcNow.AddHours(7);
            var sessionDate = attendance.Session?.SessionDate.Date ??
                _context.ClassSessions
                    .Where(s => s.SessionId == attendance.SessionId)
                    .Select(s => s.SessionDate.Date)
                    .FirstOrDefault();
            var today = now.Date;
            var cutoffDate = today.AddDays(-2);

            if (sessionDate == default)
                throw new Exception("Không tìm thấy thông tin buổi học để kiểm tra điểm danh");

            if (sessionDate > today)
                throw new Exception("Buổi học chưa diễn ra, chưa thể chỉnh sửa điểm danh");

            if (sessionDate < cutoffDate)
            {
                _logger.LogWarning("Attendance modification denied. AttendanceId: {AttendanceId}, SessionDate: {SessionDate}, Today: {Today}",
                    attendance.AttendanceId, sessionDate, today);
                throw new Exception("Chỉ được chỉnh sửa điểm danh trong vòng 2 ngày kể từ ngày học");
            }
        }
    }
}
