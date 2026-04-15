using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using EducenAPI.DTOs.Attendance;
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
            // Teacher chỉ được điểm danh trong ngày hôm đó (không được quá hạn)
            // Nếu quá hạn phải gửi yêu cầu sửa điểm danh cho Admin
            var now = DateTime.UtcNow.AddHours(7);
            var sessionDate = session.SessionDate.Date;
            var today = now.Date;

            if (sessionDate > today)
            {
                _logger.LogWarning("Attendance denied. Session {SessionId} is in future: {SessionDate}", session.SessionId, sessionDate);
                throw new Exception("Buổi học chưa diễn ra, chưa thể điểm danh");
            }

            if (sessionDate < today)
            {
                _logger.LogWarning("Attendance denied. Session {SessionId} is in past: {SessionDate}. Teacher must submit modification request.", session.SessionId, sessionDate);
                throw new Exception("Đã quá ngày điểm danh. Vui lòng gửi yêu cầu sửa điểm danh cho Admin.");
            }

            // Nếu là hôm nay: chỉ điểm danh sau giờ bắt đầu
            var schedule = _context.Schedules.Find(session.ScheduleId);
            if (schedule != null)
            {
                var sessionStart = sessionDate.Add(schedule.StartTime.ToTimeSpan());
                if (now < sessionStart)
                    throw new Exception("Buổi học chưa bắt đầu");
            }
        }

        private void ValidateAttendanceModification(Attendance attendance)
        {
            // Teacher không được sửa điểm danh quá ngày - phải gửi yêu cầu cho Admin
            var now = DateTime.UtcNow.AddHours(7);
            var sessionDate = attendance.Session?.SessionDate.Date ??
                _context.ClassSessions
                    .Where(s => s.SessionId == attendance.SessionId)
                    .Select(s => s.SessionDate.Date)
                    .FirstOrDefault();
            var today = now.Date;

            if (sessionDate == default)
                throw new Exception("Không tìm thấy thông tin buổi học để kiểm tra điểm danh");

            if (sessionDate > today)
                throw new Exception("Buổi học chưa diễn ra, chưa thể chỉnh sửa điểm danh");

            if (sessionDate < today)
            {
                _logger.LogWarning("Attendance modification denied. AttendanceId: {AttendanceId}, SessionDate: {SessionDate}, Today: {Today}. Teacher must submit modification request.",
                    attendance.AttendanceId, sessionDate, today);
                throw new Exception("Đã quá ngày điểm danh. Vui lòng gửi yêu cầu sửa điểm danh cho Admin.");
            }
        }

        // === Yêu cầu sửa điểm danh ===

        public async Task<AttendanceModificationRequest> CreateModificationRequestAsync(int sessionId, int studentId, string requestedStatus, string? reason, int requestedByUserId)
        {
            ValidateStatus(requestedStatus);

            var session = await _context.ClassSessions.FindAsync(sessionId);
            if (session == null)
                throw new Exception("Không tìm thấy buổi học");

            // Kiểm tra đã có yêu cầu đang chờ chưa
            var existingRequest = await _context.AttendanceModificationRequests
                .FirstOrDefaultAsync(r => r.SessionId == sessionId && r.StudentId == studentId && r.Status == "Pending");
            if (existingRequest != null)
                throw new Exception("Đã có yêu cầu sửa điểm danh đang chờ duyệt cho học sinh này");

            // Lấy trạng thái hiện tại
            var currentAttendance = await _context.Attendances
                .FirstOrDefaultAsync(a => a.SessionId == sessionId && a.StudentId == studentId);
            var currentStatus = currentAttendance?.Status ?? "notYet";

            var request = new AttendanceModificationRequest
            {
                SessionId = sessionId,
                StudentId = studentId,
                CurrentStatus = currentStatus,
                RequestedStatus = requestedStatus,
                Reason = reason,
                RequestedByUserId = requestedByUserId,
                Status = "Pending",
                RequestedAt = DateTime.UtcNow
            };

            _context.AttendanceModificationRequests.Add(request);
            await _context.SaveChangesAsync();

            return request;
        }
        public async Task<List<AttendanceModificationRequest>> CreateModificationRequestsAsync(int sessionId, List<AttendanceModificationStudentRequestDto> requests, int requestedByUserId)
        {
            if (requests == null || requests.Count == 0)
                throw new Exception("Danh sach yeu cau trong");

            var session = await _context.ClassSessions.FindAsync(sessionId);
            if (session == null)
                throw new Exception("Khong tim thay buoi hoc");

            var studentIds = requests.Select(r => r.StudentId).Distinct().ToList();
            var pendingStudentIds = await _context.AttendanceModificationRequests
                .Where(r => r.SessionId == sessionId && r.Status == "Pending" && studentIds.Contains(r.StudentId))
                .Select(r => r.StudentId)
                .Distinct()
                .ToListAsync();

            if (pendingStudentIds.Count > 0)
            {
                var ids = string.Join(", ", pendingStudentIds);
                throw new Exception($"Da ton tai yeu cau dang cho duyet cho cac hoc sinh: {ids}");
            }

            var currentStatusByStudent = await _context.Attendances
                .Where(a => a.SessionId == sessionId && studentIds.Contains(a.StudentId))
                .GroupBy(a => a.StudentId)
                .Select(g => new { StudentId = g.Key, Status = g.OrderByDescending(x => x.RecordedAt).Select(x => x.Status).FirstOrDefault() })
                .ToDictionaryAsync(x => x.StudentId, x => x.Status ?? "notYet");

            var entities = new List<AttendanceModificationRequest>();
            foreach (var item in requests)
            {
                ValidateStatus(item.RequestedStatus);
                var currentStatus = currentStatusByStudent.TryGetValue(item.StudentId, out var status) ? status : "notYet";

                entities.Add(new AttendanceModificationRequest
                {
                    SessionId = sessionId,
                    StudentId = item.StudentId,
                    CurrentStatus = currentStatus,
                    RequestedStatus = item.RequestedStatus,
                    Reason = item.Reason,
                    RequestedByUserId = requestedByUserId,
                    Status = "Pending",
                    RequestedAt = DateTime.UtcNow
                });
            }

            _context.AttendanceModificationRequests.AddRange(entities);
            await _context.SaveChangesAsync();
            return entities;
        }

        public async Task<List<AttendanceModificationRequestDto>> GetPendingModificationRequestsAsync(int? classId = null)
        {
            var query = _context.AttendanceModificationRequests
                .Include(r => r.Student).ThenInclude(s => s.StudentNavigation)
                .Include(r => r.Session).ThenInclude(s => s.Schedule).ThenInclude(sc => sc.Class)
                .Include(r => r.RequestedByUser)
                .Where(r => r.Status == "Pending")
                .AsNoTracking();

            if (classId.HasValue)
            {
                query = query.Where(r => r.Session != null && r.Session.Schedule != null && r.Session.Schedule.ClassId == classId.Value);
            }

            var requests = await query
                .OrderByDescending(r => r.RequestedAt)
                .ToListAsync();

            return requests.Select(r => new AttendanceModificationRequestDto
            {
                RequestId = r.RequestId,
                SessionId = r.SessionId,
                ClassId = r.Session?.Schedule?.ClassId ?? r.Session?.ClassId,
                StudentId = r.StudentId,
                StudentName = r.Student?.StudentNavigation?.FullName,
                ClassName = r.Session?.Schedule?.Class?.ClassName ?? r.Session?.Class?.ClassName,
                SessionDate = r.Session != null ? r.Session.SessionDate.ToString("dd/MM/yyyy") : null,
                Status = r.Status,
                CurrentStatus = r.CurrentStatus,
                RequestedStatus = r.RequestedStatus,
                Reason = r.Reason,
                RequestedByUserId = r.RequestedByUserId,
                RequestedByUserName = r.RequestedByUser?.FullName,
                RequestedAt = r.RequestedAt.ToString("dd/MM/yyyy HH:mm")
            }).ToList();
        }

        public async Task<bool> ApproveModificationRequestAsync(int requestId, int reviewedByUserId, string newStatus)
        {
            var request = await _context.AttendanceModificationRequests
                .Include(r => r.Session)
                .FirstOrDefaultAsync(r => r.RequestId == requestId);

            if (request == null)
                return false;

            if (request.Status != "Pending")
                throw new Exception("Yêu cầu đã được xử lý trước đó");

            // Cập nhật điểm danh
            var attendance = await _context.Attendances
                .FirstOrDefaultAsync(a => a.SessionId == request.SessionId && a.StudentId == request.StudentId);

            var reviewer = await _context.Users.FindAsync(reviewedByUserId);

            if (attendance != null)
            {
                attendance.Status = newStatus;
                attendance.RecordedAt = DateTime.UtcNow;
                attendance.UpdatedBy = reviewer;
            }
            else
            {
                var newAttendance = new Attendance
                {
                    SessionId = request.SessionId,
                    StudentId = request.StudentId,
                    Status = newStatus,
                    RecordedAt = DateTime.UtcNow,
                    UpdatedBy = reviewer
                };
                _context.Attendances.Add(newAttendance);
            }

            // Cập nhật yêu cầu
            request.Status = "Approved";
            request.ReviewedByUserId = reviewedByUserId;
            request.ReviewedAt = DateTime.UtcNow;
            request.RequestedStatus = newStatus; // Cập nhật theo status đã duyệt

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RejectModificationRequestAsync(int requestId, int reviewedByUserId, string? reviewNote)
        {
            var request = await _context.AttendanceModificationRequests.FindAsync(requestId);
            if (request == null)
                return false;

            if (request.Status != "Pending")
                throw new Exception("Yêu cầu đã được xử lý trước đó");

            var reviewer = await _context.Users.FindAsync(reviewedByUserId);

            request.Status = "Rejected";
            request.ReviewedByUserId = reviewedByUserId;
            request.ReviewedAt = DateTime.UtcNow;
            request.ReviewNote = reviewNote;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<List<AttendanceModificationRequestDto>> GetMyModificationRequestsAsync(int userId)
        {
            var requests = await _context.AttendanceModificationRequests
                .Include(r => r.Student).ThenInclude(s => s.StudentNavigation)
                .Include(r => r.Session).ThenInclude(s => s.Schedule).ThenInclude(sc => sc.Class)
                .Include(r => r.RequestedByUser)
                .Include(r => r.ReviewedByUser)
                .Where(r => r.RequestedByUserId == userId)
                .OrderByDescending(r => r.RequestedAt)
                .ToListAsync();

            return requests.Select(r => new AttendanceModificationRequestDto
            {
                RequestId = r.RequestId,
                SessionId = r.SessionId,
                ClassId = r.Session?.Schedule?.ClassId ?? r.Session?.ClassId,
                StudentId = r.StudentId,
                StudentName = r.Student?.StudentNavigation?.FullName,
                ClassName = r.Session?.Schedule?.Class?.ClassName,
                SessionDate = r.Session != null ? r.Session.SessionDate.ToString("dd/MM/yyyy") : null,
                Status = r.Status,
                CurrentStatus = r.CurrentStatus,
                RequestedStatus = r.RequestedStatus,
                Reason = r.Reason,
                RequestedByUserId = r.RequestedByUserId,
                RequestedByUserName = r.RequestedByUser?.FullName,
                ReviewedByUserId = r.ReviewedByUserId,
                ReviewedByUserName = r.ReviewedByUser?.FullName,
                RequestedAt = r.RequestedAt.ToString("dd/MM/yyyy HH:mm"),
                ReviewedAt = r.ReviewedAt?.ToString("dd/MM/yyyy HH:mm"),
                ReviewNote = r.ReviewNote
            }).ToList();
        }
    }
}


