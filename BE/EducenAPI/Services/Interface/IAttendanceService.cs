using System.Collections.Generic;
using System.Threading.Tasks;
using EducenAPI.Models;
using EducenAPI.DTOs.Attendance;

namespace EducenAPI.Services.Interface
{
    public interface IAttendanceService
    {
        Task<IEnumerable<Attendance>> GetAttendanceBySessionAsync(int sessionId);
        Task<Attendance?> GetAttendanceByIdAsync(int attendanceId);
        Task<IEnumerable<Attendance>> GetAttendanceByStudentAsync(int studentId);
        Task<IEnumerable<Attendance>> GetAttendanceByClassAsync(int classId);
        Task<Attendance> CreateOrUpdateAttendanceAsync(int sessionId, int studentId, string status, int updatedByUserId, string? role = null);
        Task<IEnumerable<Attendance>> BulkSaveAttendanceAsync(int sessionId, List<AttendanceRecord> records, int updatedByUserId, string? role = null);
        Task<bool> UpdateAttendanceAsync(int attendanceId, string status, int updatedByUserId, string? role = null);
        Task<AttendanceReportDto> GetClassAttendanceReportAsync(int classId);
        Task<IEnumerable<AttendanceSessionSummaryDto>> GetClassAttendanceSessionSummaryAsync(int classId);

        // Modification requests
        Task<AttendanceModificationRequest> CreateModificationRequestAsync(int sessionId, int studentId, string requestedStatus, string? reason, int requestedByUserId);
        Task<List<AttendanceModificationRequest>> CreateModificationRequestsAsync(int sessionId, List<AttendanceModificationStudentRequestDto> requests, int requestedByUserId);
        Task<List<AttendanceModificationRequestDto>> GetAllModificationRequestsAsync(int? classId = null);
        Task<List<AttendanceModificationRequestDto>> GetPendingModificationRequestsAsync(int? classId = null);
        Task<bool> ApproveModificationRequestAsync(int requestId, int reviewedByUserId, string newStatus);
        Task<bool> RejectModificationRequestAsync(int requestId, int reviewedByUserId, string? reviewNote);
        Task<List<AttendanceModificationRequestDto>> GetMyModificationRequestsAsync(int userId);
    }

    public class AttendanceRecord
    {
        public int StudentId { get; set; }
        public string Status { get; set; } = "notYet";
    }

    public class AttendanceReportDto
    {
        public int ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public int TotalSessions { get; set; }
        public int TotalStudents { get; set; }
        public double AttendanceRate { get; set; }
        public List<StudentAttendanceDto> StudentReports { get; set; } = new();
    }

    public class StudentAttendanceDto
    {
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public int PresentCount { get; set; }
        public int AbsentCount { get; set; }
        public int NotYetCount { get; set; }
        public double AttendanceRate { get; set; }
    }

    public class AttendanceSessionSummaryDto
    {
        public int SessionId { get; set; }
        public int PresentCount { get; set; }
        public int AbsentCount { get; set; }
    }
}
