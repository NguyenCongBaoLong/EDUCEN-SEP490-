using EducenAPI.DTOs.SupportRequestDTOs;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text.RegularExpressions;

namespace EducenAPI.Services
{
    public class SupportRequestsService : ISupportRequestsService
    {
        private readonly EducenV2Context _context;
        private readonly IUserContextService _userContext;

        public SupportRequestsService(EducenV2Context context, IUserContextService userContext)
        {
            _context = context;
            _userContext = userContext;
        }

        public async Task<SupportRequestResponseDto> CreateAsync(CreateSupportRequestDto dto)
        {
            var senderId = _userContext.GetUserId();
            var entity = new SupportRequest
            {
                SenderId = senderId,
                Title = dto.Title,
                Content = dto.Content,
                Status = "Pending",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.SupportRequests.Add(entity);
            await _context.SaveChangesAsync();

            var created = await _context.SupportRequests
                .Include(x => x.Sender)
                .Include(x => x.Receiver)
                .FirstOrDefaultAsync(x => x.Id == entity.Id);

            return MapToDto(created!);
        }

        public async Task<List<SupportRequestResponseDto>> GetMyRequestsAsync()
        {
            var userId = _userContext.GetUserId();
            var list = await _context.SupportRequests
                .Include(x => x.Sender)
                    .ThenInclude(u => u.Role)
                .Include(x => x.Receiver)
                .Where(x => x.SenderId == userId)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            return list.Select(MapToDto).ToList();
        }

        public async Task<SupportRequestResponseDto> GetMyRequestByIdAsync(int id)
        {
            var userId = _userContext.GetUserId();
            var entity = await _context.SupportRequests
                .Include(x => x.Sender)
                    .ThenInclude(u => u.Role)
                .Include(x => x.Receiver)
                .FirstOrDefaultAsync(x => x.Id == id && x.SenderId == userId);

            if (entity == null)
                throw new Exception("Khong tim thay request.");

            return MapToDto(entity);
        }

        public async Task<List<SupportRequestResponseDto>> GetAllAsync()
        {
            var list = await _context.SupportRequests
                .Include(x => x.Sender)
                    .ThenInclude(u => u.Role)
                .Include(x => x.Receiver)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            return list.Select(MapToDto).ToList();
        }

        public async Task<SupportRequestResponseDto> GetByIdAsync(int id)
        {
            var entity = await _context.SupportRequests
                .Include(x => x.Sender)
                    .ThenInclude(u => u.Role)
                .Include(x => x.Receiver)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (entity == null)
                throw new Exception("Khong tim thay request.");

            return MapToDto(entity);
        }

        public async Task<SupportRequestResponseDto> ReplyAsync(int adminId, int id, ReplySupportRequestDto dto)
        {
            var entity = await _context.SupportRequests
                .Include(x => x.Sender)
                    .ThenInclude(u => u.Role)
                .Include(x => x.Receiver)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (entity == null)
                throw new Exception("Khong tim thay request.");

            entity.ReceiverId = adminId;
            entity.AdminResponse = dto.AdminResponse;
            entity.Status = "Answered";
            entity.IsRead = true;

            await _context.SaveChangesAsync();

            return MapToDto(entity);
        }

        public async Task<SupportRequestResponseDto> ApproveAsync(int adminId, int id, string? note)
        {
            var entity = await _context.SupportRequests
                .Include(x => x.Sender)
                    .ThenInclude(u => u.Role)
                .Include(x => x.Receiver)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (entity == null)
                throw new Exception("Khong tim thay request.");

            if (IsScheduleChangeRequest(entity))
            {
                await ApplyScheduleChangeAsync(entity);
            }

            entity.ReceiverId = adminId;
            entity.Status = "Approved";
            entity.AdminResponse = string.IsNullOrWhiteSpace(note) ? "Yeu cau da duoc duyet." : note.Trim();
            entity.IsRead = true;

            await _context.SaveChangesAsync();
            return MapToDto(entity);
        }

        public async Task<SupportRequestResponseDto> RejectAsync(int adminId, int id, string reason)
        {
            if (string.IsNullOrWhiteSpace(reason))
                throw new Exception("Ly do tu choi la bat buoc.");

            var entity = await _context.SupportRequests
                .Include(x => x.Sender)
                    .ThenInclude(u => u.Role)
                .Include(x => x.Receiver)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (entity == null)
                throw new Exception("Khong tim thay request.");

            entity.ReceiverId = adminId;
            entity.Status = "Rejected";
            entity.AdminResponse = reason.Trim();
            entity.IsRead = true;

            await _context.SaveChangesAsync();
            return MapToDto(entity);
        }

        public async Task<bool> MarkAsReadAsync(int id)
        {
            var entity = await _context.SupportRequests.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null)
                return false;

            entity.IsRead = true;
            await _context.SaveChangesAsync();
            return true;
        }

        private async Task ApplyScheduleChangeAsync(SupportRequest request)
        {
            var parsed = ParseScheduleChangeRequest(request.Content);
            if (parsed.ClassId == null)
                throw new Exception("Khong the duyet: thieu ClassId trong yeu cau doi lich.");
            if (parsed.NewDayOfWeek == null || parsed.NewStartTime == null || parsed.NewEndTime == null)
                throw new Exception("Khong the duyet: thieu thong tin slot moi trong yeu cau.");
            if (parsed.NewStartTime >= parsed.NewEndTime)
                throw new Exception("Khong the duyet: gio bat dau phai nho hon gio ket thuc.");

            var classEntity = await _context.Classes
                .Include(c => c.Schedules)
                .FirstOrDefaultAsync(c => c.ClassId == parsed.ClassId.Value);
            if (classEntity == null)
                throw new Exception("Khong the duyet: khong tim thay lop hoc.");

            var senderId = request.SenderId;
            var isOwner = classEntity.TeacherId == senderId || classEntity.AssistantId == senderId;
            if (!isOwner)
                throw new Exception("Khong the duyet: nguoi gui khong thuoc lop hoc nay.");

            var targetSchedule = ResolveTargetSchedule(classEntity.Schedules, parsed);
            if (targetSchedule == null)
                throw new Exception("Khong the duyet: khong tim thay slot hien tai de cap nhat.");

            var teacherIds = new[] { classEntity.TeacherId, classEntity.AssistantId }
                .Where(x => x.HasValue)
                .Select(x => x!.Value)
                .ToList();

            var hasTeacherConflict = await _context.Schedules
                .AsNoTracking()
                .Include(s => s.Class)
                .Where(s =>
                    s.ClassId != classEntity.ClassId &&
                    s.DayOfWeek == parsed.NewDayOfWeek.Value &&
                    s.StartTime < parsed.NewEndTime.Value &&
                    s.EndTime > parsed.NewStartTime.Value &&
                    ((s.Class.TeacherId.HasValue && teacherIds.Contains(s.Class.TeacherId.Value)) ||
                     (s.Class.AssistantId.HasValue && teacherIds.Contains(s.Class.AssistantId.Value))))
                .AnyAsync();

            if (hasTeacherConflict)
                throw new Exception("Khong the duyet: giao vien/ta bi trung lich.");

            var targetRoomId = parsed.RequestedRoomId ?? targetSchedule.RoomId ?? classEntity.RoomId;
            if (targetRoomId.HasValue)
            {
                var hasRoomConflict = await _context.Schedules
                    .AsNoTracking()
                    .Where(s =>
                        s.ClassId != classEntity.ClassId &&
                        s.RoomId == targetRoomId.Value &&
                        s.DayOfWeek == parsed.NewDayOfWeek.Value &&
                        s.StartTime < parsed.NewEndTime.Value &&
                        s.EndTime > parsed.NewStartTime.Value)
                    .AnyAsync();

                if (hasRoomConflict)
                    throw new Exception("Khong the duyet: phong hoc bi trung lich.");
            }

            targetSchedule.DayOfWeek = parsed.NewDayOfWeek.Value;
            targetSchedule.StartTime = parsed.NewStartTime.Value;
            targetSchedule.EndTime = parsed.NewEndTime.Value;

            if (parsed.RequestedRoomId.HasValue)
            {
                targetSchedule.RoomId = parsed.RequestedRoomId.Value;
                classEntity.RoomId = parsed.RequestedRoomId.Value;
            }
        }

        private static bool IsScheduleChangeRequest(SupportRequest request)
        {
            var title = (request.Title ?? string.Empty).ToLowerInvariant();
            var content = (request.Content ?? string.Empty).ToLowerInvariant();

            return title.Contains("[schedule_change]")
                || content.Contains("type: schedule_change")
                || title.Contains("doi lich day")
                || content.Contains("requestedslot:");
        }

        private static Schedule? ResolveTargetSchedule(IEnumerable<Schedule> schedules, ParsedScheduleChangeRequest parsed)
        {
            var all = schedules?.ToList() ?? new List<Schedule>();
            if (!all.Any()) return null;

            if (parsed.CurrentDayOfWeek.HasValue && parsed.CurrentStartTime.HasValue && parsed.CurrentEndTime.HasValue)
            {
                var matched = all.FirstOrDefault(s =>
                    s.DayOfWeek == parsed.CurrentDayOfWeek.Value &&
                    s.StartTime == parsed.CurrentStartTime.Value &&
                    s.EndTime == parsed.CurrentEndTime.Value);
                if (matched != null) return matched;
            }

            return all.OrderBy(s => s.ScheduleId).FirstOrDefault();
        }

        private static ParsedScheduleChangeRequest ParseScheduleChangeRequest(string content)
        {
            var parsed = new ParsedScheduleChangeRequest();
            if (string.IsNullOrWhiteSpace(content))
                return parsed;

            var classIdMatch = Regex.Match(content, @"ClassId:\s*(\d+)", RegexOptions.IgnoreCase);
            if (classIdMatch.Success && int.TryParse(classIdMatch.Groups[1].Value, out var classId))
                parsed.ClassId = classId;

            var requestedRoomMatch = Regex.Match(content, @"RequestedRoomId:\s*(\d+)", RegexOptions.IgnoreCase);
            if (requestedRoomMatch.Success && int.TryParse(requestedRoomMatch.Groups[1].Value, out var roomId))
                parsed.RequestedRoomId = roomId;

            var currentSlot = ExtractSlot(content, @"CurrentSlot:\s*([^\(]+)\(([^)]+)\)");
            if (!currentSlot.HasValue)
                currentSlot = ExtractSlot(content, @"Slot hiện tại:\s*([^\(]+)\(([^)]+)\)");
            if (currentSlot.HasValue)
            {
                parsed.CurrentDayOfWeek = currentSlot.Value.DayOfWeek;
                parsed.CurrentStartTime = currentSlot.Value.Start;
                parsed.CurrentEndTime = currentSlot.Value.End;
            }

            var requestedSlot = ExtractSlot(content, @"RequestedSlot:\s*([^\(]+)\(([^)]+)\)");
            if (!requestedSlot.HasValue)
                requestedSlot = ExtractSlot(content, @"Slot (?:mới|đề xuất):\s*([^\(]+)\(([^)]+)\)");
            if (requestedSlot.HasValue)
            {
                parsed.NewDayOfWeek = requestedSlot.Value.DayOfWeek;
                parsed.NewStartTime = requestedSlot.Value.Start;
                parsed.NewEndTime = requestedSlot.Value.End;
            }

            return parsed;
        }

        private static (int DayOfWeek, TimeOnly Start, TimeOnly End)? ExtractSlot(string content, string pattern)
        {
            var match = Regex.Match(content, pattern, RegexOptions.IgnoreCase);
            if (!match.Success) return null;

            var dayLabel = match.Groups[1].Value.Trim();
            var timeRange = match.Groups[2].Value.Trim();
            var parts = timeRange.Split('-', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length != 2) return null;

            if (!TryParseDayOfWeek(dayLabel, out var dayOfWeek)) return null;
            if (!TimeOnly.TryParseExact(parts[0], "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var start)) return null;
            if (!TimeOnly.TryParseExact(parts[1], "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var end)) return null;

            return (dayOfWeek, start, end);
        }

        private static bool TryParseDayOfWeek(string label, out int dayOfWeek)
        {
            dayOfWeek = 0;
            if (string.IsNullOrWhiteSpace(label)) return false;

            var value = label.Trim().ToLowerInvariant();
            if (value == "thứ hai" || value == "monday") { dayOfWeek = 1; return true; }
            if (value == "thứ ba" || value == "tuesday") { dayOfWeek = 2; return true; }
            if (value == "thứ tư" || value == "wednesday") { dayOfWeek = 3; return true; }
            if (value == "thứ năm" || value == "thursday") { dayOfWeek = 4; return true; }
            if (value == "thứ sáu" || value == "friday") { dayOfWeek = 5; return true; }
            if (value == "thứ bảy" || value == "saturday") { dayOfWeek = 6; return true; }
            if (value == "chủ nhật" || value == "sunday") { dayOfWeek = 0; return true; }
            return false;
        }

        private SupportRequestResponseDto MapToDto(SupportRequest x)
        {
            return new SupportRequestResponseDto
            {
                Id = x.Id,
                SenderId = x.SenderId,
                SenderName = x.Sender?.FullName ?? string.Empty,
                SenderRoleName = x.Sender?.Role?.RoleName ?? string.Empty,
                ReceiverId = x.ReceiverId,
                ReceiverName = x.Receiver?.FullName,
                Title = x.Title,
                Content = x.Content,
                Status = x.Status,
                IsRead = x.IsRead,
                CreatedAt = x.CreatedAt,
                AdminResponse = x.AdminResponse,
            };
        }

        private sealed class ParsedScheduleChangeRequest
        {
            public int? ClassId { get; set; }
            public int? RequestedRoomId { get; set; }
            public int? CurrentDayOfWeek { get; set; }
            public TimeOnly? CurrentStartTime { get; set; }
            public TimeOnly? CurrentEndTime { get; set; }
            public int? NewDayOfWeek { get; set; }
            public TimeOnly? NewStartTime { get; set; }
            public TimeOnly? NewEndTime { get; set; }
        }
    }
}
