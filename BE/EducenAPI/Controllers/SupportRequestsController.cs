using EducenAPI.DTOs.SupportRequestDTOs;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/support-requests")]
    [ApiController]
    [Authorize(Roles = "Parent,Teacher,Assistant,Student")]
    public class SupportRequestsController : ControllerBase
    {
        private readonly ISupportRequestsService _service;
        private readonly EducenV2Context _context;
        private readonly IUserContextService _userContext;

        public SupportRequestsController(
            ISupportRequestsService service,
            EducenV2Context context,
            IUserContextService userContext)
        {
            _service = service;
            _context = context;
            _userContext = userContext;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSupportRequestDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return Ok(result);
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMyRequests()
        {
            var result = await _service.GetMyRequestsAsync();
            return Ok(result);
        }

        [HttpGet("my/{id}")]
        public async Task<IActionResult> GetMyRequestById(int id)
        {
            var result = await _service.GetMyRequestByIdAsync(id);
            return Ok(result);
        }

        [HttpPost("validate-schedule-change")]
        [Authorize(Roles = "Teacher,Assistant")]
        public async Task<IActionResult> ValidateScheduleChange([FromBody] ValidateScheduleChangeDto dto)
        {
            var response = new ValidateScheduleChangeResponseDto();

            if (!TimeOnly.TryParse(dto.StartTime, out var startTime) || !TimeOnly.TryParse(dto.EndTime, out var endTime))
            {
                response.Errors.Add("Giờ bắt đầu/kết thúc không hợp lệ.");
                response.IsValid = false;
                return Ok(response);
            }

            if (startTime >= endTime)
            {
                response.Errors.Add("Giờ bắt đầu phải nhỏ hơn giờ kết thúc.");
                response.IsValid = false;
                return Ok(response);
            }

            var currentUserId = _userContext.GetUserId();
            var classEntity = await _context.Classes
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.ClassId == dto.ClassId);

            if (classEntity == null)
            {
                response.Errors.Add("Không tìm thấy lớp học.");
                response.IsValid = false;
                return Ok(response);
            }

            var isOwner = classEntity.TeacherId == currentUserId || classEntity.AssistantId == currentUserId;
            if (!isOwner)
            {
                response.Errors.Add("Bạn không có quyền gửi yêu cầu đổi lịch cho lớp này.");
                response.IsValid = false;
                return Ok(response);
            }

            var teacherConflicts = await _context.Schedules
                .AsNoTracking()
                .Include(s => s.Class)
                .Where(s =>
                    s.DayOfWeek == dto.DayOfWeek &&
                    s.ClassId != dto.ClassId &&
                    (s.Class.TeacherId == currentUserId || s.Class.AssistantId == currentUserId) &&
                    s.StartTime < endTime &&
                    s.EndTime > startTime)
                .Select(s => $"{s.Class.ClassName} ({s.StartTime:HH\\:mm}-{s.EndTime:HH\\:mm})")
                .ToListAsync();

            if (teacherConflicts.Any())
            {
                response.TeacherConflicts = teacherConflicts;
                response.Errors.Add("Bị trùng lịch dạy với lớp khác của giáo viên.");
            }

            var roomId = await _context.Schedules
                .AsNoTracking()
                .Where(s => s.ClassId == dto.ClassId && s.RoomId.HasValue)
                .Select(s => s.RoomId)
                .FirstOrDefaultAsync();

            if (roomId.HasValue)
            {
                var roomConflicts = await _context.Schedules
                    .AsNoTracking()
                    .Include(s => s.Class)
                    .Where(s =>
                        s.DayOfWeek == dto.DayOfWeek &&
                        s.ClassId != dto.ClassId &&
                        s.RoomId == roomId &&
                        s.StartTime < endTime &&
                        s.EndTime > startTime)
                    .Select(s => $"{s.Class.ClassName} ({s.StartTime:HH\\:mm}-{s.EndTime:HH\\:mm})")
                    .ToListAsync();

                if (roomConflicts.Any())
                {
                    response.RoomConflicts = roomConflicts;
                    response.Errors.Add("Phòng học bị trùng lịch với lớp khác.");
                }
            }

            response.IsValid = !response.Errors.Any();
            return Ok(response);
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var success = await _service.MarkAsReadAsync(id);
            if (!success) return NotFound("Không tìm thấy request.");
            return Ok("Đã đánh dấu đã đọc.");
        }
    }
}
