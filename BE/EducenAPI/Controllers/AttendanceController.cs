using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Controllers
{
    [Route("api/attendance")]
    [ApiController]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly IAttendanceService _service;
        private readonly EducenV2Context _context;

        public AttendanceController(IAttendanceService service, EducenV2Context context)
        {
            _service = service;
            _context = context;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : 0;
        }

        private string GetCurrentUserRole()
        {
            return User.FindFirst(ClaimTypes.Role)?.Value ?? "";
        }

        private bool IsTeacherOrAssistant()
        {
            var role = GetCurrentUserRole();
            return role == "Teacher" || role == "Assistant" || role == "Admin";
        }

        // GET: api/attendance/session/{sessionId}
        [HttpGet("session/{sessionId:int}")]
        [Authorize(Roles = "Admin,Teacher,Assistant")]
        public async Task<IActionResult> GetAttendanceBySession(int sessionId)
        {
            try
            {
                var attendance = await _service.GetAttendanceBySessionAsync(sessionId);
                var result = attendance.Select(a => new
                {
                    attendanceId = a.AttendanceId,
                    sessionId = a.SessionId,
                    studentId = a.StudentId,
                    studentName = a.Student?.StudentNavigation?.FullName,
                    status = a.Status,
                    recordedAt = a.RecordedAt
                });
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/attendance/student/{studentId}
        [HttpGet("student/{studentId:int}")]
        [Authorize(Roles = "Admin,Teacher,Assistant,Student,Parent")]
        public async Task<IActionResult> GetAttendanceByStudent(int studentId)
        {
            try
            {
                var attendance = await _service.GetAttendanceByStudentAsync(studentId);
                var result = attendance.Select(a => new
                {
                    attendanceId = a.AttendanceId,
                    sessionId = a.SessionId,
                    sessionDate = a.Session?.SessionDate,
                    className = a.Session?.Schedule?.Class?.ClassName,
                    status = a.Status,
                    recordedAt = a.RecordedAt
                });
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/attendance/class/{classId}/report
        [HttpGet("class/{classId:int}/report")]
        [Authorize(Roles = "Admin,Teacher,Assistant")]
        public async Task<IActionResult> GetClassAttendanceReport(int classId)
        {
            try
            {
                var report = await _service.GetClassAttendanceReportAsync(classId);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/attendance/class/{classId}/sessions-summary
        [HttpGet("class/{classId:int}/sessions-summary")]
        [Authorize(Roles = "Admin,Teacher,Assistant")]
        public async Task<IActionResult> GetClassAttendanceSessionSummary(int classId)
        {
            try
            {
                var summary = await _service.GetClassAttendanceSessionSummaryAsync(classId);
                return Ok(summary);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/attendance/session/{sessionId}/bulk
        [HttpPost("session/{sessionId:int}/bulk")]
        [Authorize(Roles = "Admin,Teacher,Assistant")]
        public async Task<IActionResult> BulkSaveAttendance(int sessionId, [FromBody] List<AttendanceRecordDto> records)
        {
            if (!IsTeacherOrAssistant())
                return Forbid();

            if (records == null || records.Count == 0)
                return BadRequest(new { message = "Danh sách điểm danh trống" });

            try
            {
                var currentUserId = GetCurrentUserId();
                var attendanceRecords = records.Select(r => new AttendanceRecord
                {
                    StudentId = r.StudentId,
                    Status = r.Status
                }).ToList();

                await _service.BulkSaveAttendanceAsync(sessionId, attendanceRecords, currentUserId);
                return Ok(new { message = "Lưu điểm danh thành công" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/attendance/session/{sessionId}/quick
        [HttpPost("session/{sessionId:int}/quick")]
        [Authorize(Roles = "Admin,Teacher,Assistant")]
        public async Task<IActionResult> QuickAttendance(int sessionId, [FromBody] QuickAttendanceDto dto)
        {
            if (!IsTeacherOrAssistant())
                return Forbid();

            if (dto.StudentIds == null || dto.StudentIds.Count == 0)
                return BadRequest(new { message = "Danh sách học sinh trống" });

            try
            {
                var currentUserId = GetCurrentUserId();
                var records = dto.StudentIds.Select(studentId => new AttendanceRecord
                {
                    StudentId = studentId,
                    Status = "present"
                }).ToList();

                await _service.BulkSaveAttendanceAsync(sessionId, records, currentUserId);
                return Ok(new { message = "Điểm danh nhanh thành công" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/attendance/{attendanceId}
        [HttpPut("{attendanceId:int}")]
        [Authorize(Roles = "Admin,Teacher,Assistant")]
        public async Task<IActionResult> UpdateAttendance(int attendanceId, [FromBody] UpdateAttendanceDto dto)
        {
            if (!IsTeacherOrAssistant())
                return Forbid();

            try
            {
                var currentUserId = GetCurrentUserId();
                var success = await _service.UpdateAttendanceAsync(attendanceId, dto.Status, currentUserId);
                
                if (!success)
                    return NotFound(new { message = "Không tìm thấy bản ghi điểm danh" });

                return Ok(new { message = "Cập nhật điểm danh thành công" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/attendance/session/{sessionId}/can-attend
        [HttpGet("session/{sessionId:int}/can-attend")]
        [Authorize(Roles = "Admin,Teacher,Assistant")]
        public async Task<IActionResult> CanAttendSession(int sessionId)
        {
            try
            {
                var session = await _context.ClassSessions.FindAsync(sessionId);
                if (session == null)
                    return NotFound(new { message = "Không tìm thấy buổi học" });

                // Teacher chỉ được điểm danh trong ngày hôm đó
                var now = DateTime.UtcNow.AddHours(7);
                var sessionDate = session.SessionDate.Date;
                var today = now.Date;

                if (sessionDate > today)
                    return Ok(new { canAttend = false, message = "Buổi học chưa diễn ra" });

                if (sessionDate < today)
                    return Ok(new { canAttend = false, message = "Đã quá ngày điểm danh. Vui lòng gửi yêu cầu sửa điểm danh cho Admin." });

                var schedule = await _context.Schedules.FindAsync(session.ScheduleId);
                if (schedule != null && sessionDate == today)
                {
                    var sessionStart = sessionDate.Add(schedule.StartTime.ToTimeSpan());
                    if (now < sessionStart)
                        return Ok(new { canAttend = false, message = "Buổi học chưa bắt đầu" });
                }

                return Ok(new { canAttend = true, message = "Có thể điểm danh" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // === Yêu cầu sửa điểm danh ===

        // POST: api/attendance/modification-request - Teacher gửi yêu cầu sửa điểm danh
        [HttpPost("modification-request")]
        [Authorize(Roles = "Admin,Teacher,Assistant")]
        public async Task<IActionResult> CreateModificationRequest([FromBody] DTOs.Attendance.CreateAttendanceModificationRequestDto dto)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var request = await _service.CreateModificationRequestAsync(
                    dto.SessionId, 
                    dto.StudentId, 
                    dto.RequestedStatus, 
                    dto.Reason, 
                    currentUserId);
                
                return Ok(new { message = "Gửi yêu cầu sửa điểm danh thành công", requestId = request.RequestId });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/attendance/modification-requests/batch - Teacher gửi nhiều yêu cầu sửa điểm danh
        [HttpPost("modification-requests/batch")]
        [Authorize(Roles = "Admin,Teacher,Assistant")]
        public async Task<IActionResult> CreateModificationRequestsBatch([FromBody] DTOs.Attendance.CreateAttendanceModificationBatchRequestDto dto)
        {
            if (dto.Requests == null || dto.Requests.Count == 0)
                return BadRequest(new { message = "Danh sách yêu cầu trống" });

            try
            {
                var currentUserId = GetCurrentUserId();
                var requests = await _service.CreateModificationRequestsAsync(dto.SessionId, dto.Requests, currentUserId);
                return Ok(new
                {
                    message = "Gửi yêu cầu sửa điểm danh thành công",
                    count = requests.Count,
                    requestIds = requests.Select(x => x.RequestId).ToList()
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/attendance/modification-requests/pending - Admin xem yêu cầu chờ duyệt
        [HttpGet("modification-requests/pending")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetPendingModificationRequests([FromQuery] int? classId = null)
        {
            try
            {
                var requests = await _service.GetPendingModificationRequestsAsync(classId);
                return Ok(requests);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/attendance/modification-requests/my - Teacher xem yêu cầu của mình
        [HttpGet("modification-requests/my")]
        [Authorize(Roles = "Admin,Teacher,Assistant")]
        public async Task<IActionResult> GetMyModificationRequests()
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var requests = await _service.GetMyModificationRequestsAsync(currentUserId);
                return Ok(requests);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/attendance/modification-requests/{requestId}/approve - Admin duyệt yêu cầu
        [HttpPut("modification-requests/{requestId:int}/approve")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ApproveModificationRequest(int requestId, [FromBody] DTOs.Attendance.ReviewAttendanceModificationRequestDto dto)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var success = await _service.ApproveModificationRequestAsync(requestId, currentUserId, dto.NewStatus ?? "present");
                
                if (!success)
                    return NotFound(new { message = "Không tìm thấy yêu cầu" });

                return Ok(new { message = "Duyệt yêu cầu và cập nhật điểm danh thành công" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/attendance/modification-requests/{requestId}/reject - Admin từ chối yêu cầu
        [HttpPut("modification-requests/{requestId:int}/reject")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RejectModificationRequest(int requestId, [FromBody] DTOs.Attendance.ReviewAttendanceModificationRequestDto dto)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var success = await _service.RejectModificationRequestAsync(requestId, currentUserId, dto.ReviewNote);
                
                if (!success)
                    return NotFound(new { message = "Không tìm thấy yêu cầu" });

                return Ok(new { message = "Từ chối yêu cầu thành công" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class AttendanceRecordDto
    {
        public int StudentId { get; set; }
        public string Status { get; set; } = "notYet";
    }

    public class QuickAttendanceDto
    {
        public List<int> StudentIds { get; set; } = new();
    }

    public class UpdateAttendanceDto
    {
        public string Status { get; set; } = "notYet";
    }
}
