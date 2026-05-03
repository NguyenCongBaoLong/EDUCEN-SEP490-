using EducenAPI.DTOs.SupportRequestDTOs;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;

namespace EducenAPI.Services
{
    public class SupportRequestsService : ISupportRequestsService
    {
        private readonly EducenV2Context _context;
        private readonly IUserContextService _userContext;
        private readonly MailService _mailService;
        private readonly ILogger<SupportRequestsService> _logger;
        private readonly IClassService _classService;

        public SupportRequestsService(
            EducenV2Context context,
            IUserContextService userContext,
            MailService mailService,
            ILogger<SupportRequestsService> logger,
            IClassService classService)
        {
            _context = context;
            _userContext = userContext;
            _mailService = mailService;
            _logger = logger;
            _classService = classService;
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
                throw new Exception("Không tìm thấy request.");

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
                throw new Exception("Không tìm thấy request.");

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
                throw new Exception("Không tìm thấy request.");

            entity.ReceiverId = adminId;
            entity.AdminResponse = dto.AdminResponse;
            entity.Status = "Answered";
            entity.IsRead = false; // Reset để thông báo cho người gửi

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
                throw new Exception("Không tìm thấy request.");

            if (IsScheduleChangeRequest(entity))
            {
                await ApplyScheduleChangeAsync(entity);
            }

            entity.ReceiverId = adminId;
            entity.Status = "Approved";
            entity.AdminResponse = string.IsNullOrWhiteSpace(note) ? "Yêu cầu đã được duyệt." : note.Trim();
            entity.IsRead = false; // Reset để thông báo cho người gửi

            await _context.SaveChangesAsync();
            await SendSupportRequestReviewEmailAsync(entity, true);
            return MapToDto(entity);
        }

        public async Task<SupportRequestResponseDto> RejectAsync(int adminId, int id, string reason)
        {
            if (string.IsNullOrWhiteSpace(reason))
                throw new Exception("Lý do từ chối là bắt buộc.");

            var entity = await _context.SupportRequests
                .Include(x => x.Sender)
                    .ThenInclude(u => u.Role)
                .Include(x => x.Receiver)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (entity == null)
                throw new Exception("Không tìm thấy request.");

            entity.ReceiverId = adminId;
            entity.Status = "Rejected";
            entity.AdminResponse = reason.Trim();
            entity.IsRead = false; // Reset để thông báo cho người gửi

            await _context.SaveChangesAsync();
            await SendSupportRequestReviewEmailAsync(entity, false);
            return MapToDto(entity);
        }

        private async Task SendSupportRequestReviewEmailAsync(SupportRequest request, bool approved)
        {
            var toEmail = request.Sender?.Email;
            if (string.IsNullOrWhiteSpace(toEmail))
            {
                _logger.LogWarning("Skip support request review email because sender email is empty. RequestId={RequestId}", request.Id);
                return;
            }

            var safeTitle = WebUtility.HtmlEncode(request.Title ?? "(không có tiêu đề)");
            var safeResponse = WebUtility.HtmlEncode(request.AdminResponse ?? string.Empty);
            var subject = approved
                ? "[Educen] Kết quả xử lý yêu cầu hỗ trợ: Đã duyệt"
                : "[Educen] Kết quả xử lý yêu cầu hỗ trợ: Từ chối";
            var resultText = approved ? "ĐÃ DUYỆT" : "TỪ CHỐI";
            var actionHint = approved
                ? "Yêu cầu của bạn đã được xử lý thành công. Vui lòng kiểm tra hệ thống để xem cập nhật chi tiết."
                : "Yêu cầu của bạn đã bị từ chối. Vui lòng xem lý do phản hồi và tạo yêu cầu mới nếu cần.";
            var body = $@"
                <div style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                    <p>Xin chào,</p>
                    <p>Yêu cầu hỗ trợ của bạn đã được cập nhật kết quả.</p>
                    <p><strong>Mã yêu cầu:</strong> #{request.Id}</p>
                    <p><strong>Tiêu đề:</strong> {safeTitle}</p>
                    <p><strong>Kết quả:</strong> {resultText}</p>
                    <p><strong>Phản hồi từ trung tâm:</strong> {safeResponse}</p>
                    <p>{actionHint}</p>
                    <p>Trân trọng,<br/>Hệ thống Educen</p>
                </div>";

            try
            {
                await _mailService.SendEmailAsync(toEmail, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send support request review email. RequestId={RequestId}, Approved={Approved}", request.Id, approved);
            }
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
                throw new Exception("Không thể duyệt: thiếu ClassId trong yêu cầu đổi lịch.");
            if (parsed.NewDayOfWeek == null || parsed.NewStartTime == null || parsed.NewEndTime == null)
                throw new Exception("Không thể duyệt: thiếu thông tin slot mới trong yêu cầu.");
            if (parsed.NewStartTime >= parsed.NewEndTime)
                throw new Exception("Không thể duyệt: giờ bắt đầu phải nhỏ hơn giờ kết thúc.");

            // For single session change, require TargetSessionDate
            if (parsed.ChangeType == "single_session" && parsed.TargetSessionDate == null)
                throw new Exception("Không thể duyệt: thiếu ngày cụ thể để đổi (TargetSessionDate).");

            _logger.LogInformation("[ApplyScheduleChange] Starting for Request {RequestId}, Class {ClassId}, ChangeType {ChangeType}", request.Id, parsed.ClassId, parsed.ChangeType);

            var classEntity = await _context.Classes
                .Include(c => c.Schedules)
                .FirstOrDefaultAsync(c => c.ClassId == parsed.ClassId.Value);
                
            if (classEntity == null)
                throw new Exception("Không thể duyệt: không tìm thấy lớp học.");

            _logger.LogInformation("[ApplyScheduleChange] Found class {ClassName}. Current schedule count: {Count}", 
                classEntity.ClassName, classEntity.Schedules?.Count ?? 0);

            // 1. Chuan bi danh sach slots moi
            var currentSlots = classEntity.Schedules.Select(s => new EducenAPI.DTOs.Classes.CreateScheduleSlotDto
            {
                Slot = s.ScheduleId,
                DayOfWeek = s.DayOfWeek,
                StartTime = s.StartTime.ToString("HH:mm"),
                EndTime = s.EndTime.ToString("HH:mm"),
                RoomId = s.RoomId
            }).ToList();

            // 2. Tim slot can thay the
            _logger.LogInformation("[ApplyScheduleChange] Attempting to resolve target slot for matching: Day={Day}, Start={Start}, End={End}", 
                parsed.CurrentDayOfWeek, parsed.CurrentStartTime, parsed.CurrentEndTime);

            var targetSlotDto = ResolveTargetSlot(currentSlots, parsed);
            if (targetSlotDto == null)
                throw new Exception("Không thể duyệt: không tìm thấy slot hiện tại để cập nhật.");

            _logger.LogInformation("[ApplyScheduleChange] Target slot resolved: SlotId={SlotId}, Day={Day}, Time={Start}-{End}", 
                targetSlotDto.Slot, targetSlotDto.DayOfWeek, targetSlotDto.StartTime, targetSlotDto.EndTime);

            // 3. Cập nhật slot (chỉ cho full_schedule mode)
            if (parsed.ChangeType == "full_schedule")
            {
                targetSlotDto.DayOfWeek = parsed.NewDayOfWeek.Value;
                targetSlotDto.StartTime = parsed.NewStartTime.Value.ToString("HH:mm");
                targetSlotDto.EndTime = parsed.NewEndTime.Value.ToString("HH:mm");
                if (parsed.RequestedRoomId.HasValue)
                    targetSlotDto.RoomId = parsed.RequestedRoomId.Value;

                _logger.LogInformation("[ApplyScheduleChange] Slot updated in memory. New values: Day={Day}, Time={Start}-{End}",
                    targetSlotDto.DayOfWeek, targetSlotDto.StartTime, targetSlotDto.EndTime);
            }

            // 4. Xử lý theo change type
            if (parsed.ChangeType == "single_session")
            {
                await ApplySingleSessionChangeAsync(classEntity, parsed);
            }
            else
            {
                // 5. Goi UpdateClassAsync de thuc hien thay doi logic (gom ca session regeneration)
                // QUAN TRỌNG: Phải copy toàn bộ thông tin hiện tại của lớp để tránh bị UpdateClassAsync xóa trắng
                var updateDto = new EducenAPI.DTOs.Classes.UpdateClassDto
            {
                ClassName = classEntity.ClassName,
                Description = classEntity.Description,
                SyllabusContent = classEntity.SyllabusContent,
                SubjectId = classEntity.SubjectId,
                RoomId = classEntity.RoomId,
                GradeId = classEntity.GradeId,
                TeacherId = classEntity.TeacherId,
                AssistantId = classEntity.AssistantId,
                MaxStudents = classEntity.MaxStudents,
                Status = classEntity.Status,
                StartDate = classEntity.StartDate,
                EndDate = classEntity.EndDate,
                PricePerSession = classEntity.PricePerSession,
                ScheduleSlots = currentSlots
            };
            
            // Xóa tracking class hiện tại trước khi gọi Service khác (để tránh conflict)
            _context.Entry(classEntity).State = EntityState.Detached;
            foreach(var s in classEntity.Schedules) _context.Entry(s).State = EntityState.Detached;

            var success = await _classService.UpdateClassAsync(classEntity.ClassId, updateDto);
            if (!success)
                throw new Exception("Có lỗi xảy ra khi cập nhật lịch thực tế từ ClassService.");

            if (_context.Entry(request).State == EntityState.Detached)
            {
                _context.SupportRequests.Attach(request);
            }

                _logger.LogInformation("[ApplyScheduleChange] UpdateClassAsync SUCCESS for Request {RequestId}", request.Id);
            }
        }

        private async Task ApplySingleSessionChangeAsync(Class classEntity, ParsedScheduleChangeRequest parsed)
        {
            _logger.LogInformation("[ApplySingleSessionChange] Starting for Class {ClassId}, TargetDate {TargetDate}",
                classEntity.ClassId, parsed.TargetSessionDate);

            // Find the session to change
            var targetDate = parsed.TargetSessionDate.Value.Date;
            var targetSession = await _context.ClassSessions
                .Include(s => s.Schedule)
                .FirstOrDefaultAsync(s => s.ClassId == classEntity.ClassId && s.SessionDate.Date == targetDate);

            // Validate: only future sessions can be changed
            var today = DateTime.UtcNow.AddHours(7).Date;
            if (targetDate < today)
                throw new Exception("Không thể đổi buổi học đã diễn ra trong quá khứ.");

            // If session doesn't exist, create it
            if (targetSession == null)
            {
                _logger.LogInformation("[ApplySingleSessionChange] Session not found on {TargetDate}, creating new session", targetDate);
                
                // Find the original schedule for this class
                var classSchedules = await _context.Schedules
                    .Where(s => s.ClassId == classEntity.ClassId && s.DayOfWeek == parsed.CurrentDayOfWeek.Value)
                    .ToListAsync();

                Schedule originalSchedule = null;
                originalSchedule = classSchedules.FirstOrDefault(s => 
                    s.StartTime.ToString() == parsed.CurrentStartTime.Value.ToString("HH:mm") &&
                    s.EndTime.ToString() == parsed.CurrentEndTime.Value.ToString("HH:mm"));

                if (originalSchedule == null)
                {
                    _logger.LogWarning("[ApplySingleSessionChange] Could not find exact time match. Available schedules for day {DayOfWeek}:", parsed.CurrentDayOfWeek.Value);
                    foreach (var sched in classSchedules)
                    {
                        _logger.LogWarning("  - ScheduleId: {ScheduleId}, StartTime: {StartTime}, EndTime: {EndTime}", 
                            sched.ScheduleId, sched.StartTime, sched.EndTime);
                    }
                    _logger.LogWarning("  - Looking for StartTime: {StartTime}, EndTime: {EndTime}", 
                        parsed.CurrentStartTime.Value, parsed.CurrentEndTime.Value);
                    
                    // Fallback: use any schedule on that day if exact time match fails
                    originalSchedule = classSchedules.FirstOrDefault();
                    if (originalSchedule == null)
                    {
                        throw new Exception($"Không tìm thấy lịch gốc cho lớp {classEntity.ClassId} vào thứ {parsed.CurrentDayOfWeek.Value}");
                    }
                    _logger.LogWarning("[ApplySingleSessionChange] Using fallback schedule {ScheduleId}", originalSchedule.ScheduleId);
                }

                targetSession = new ClassSession
                {
                    ClassId = classEntity.ClassId,
                    SessionDate = targetDate,
                    ScheduleId = originalSchedule.ScheduleId,
                    Status = "Scheduled"
                };

                _context.ClassSessions.Add(targetSession);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("[ApplySingleSessionChange] Created new session {SessionId} with original schedule {ScheduleId}", 
                    targetSession.SessionId, originalSchedule.ScheduleId);
            }

            // For single session change:
            // - Keep old date as an override marker (status Rescheduled) so recurring slot can be hidden on old date
            // - Create/update one scheduled session at new date for actual teaching slot
            var newDate = targetDate;
            if (parsed.CurrentDayOfWeek.Value != parsed.NewDayOfWeek.Value)
            {
                // Calculate new date based on day difference
                var dayDiff = parsed.NewDayOfWeek.Value - parsed.CurrentDayOfWeek.Value;
                newDate = targetDate.AddDays(dayDiff);
            }

            var oldScheduleId = targetSession.ScheduleId;
            targetSession.Status = "Rescheduled";

            var movedSession = await _context.ClassSessions
                .FirstOrDefaultAsync(s =>
                    s.ClassId == classEntity.ClassId &&
                    s.SessionDate.Date == newDate.Date &&
                    s.ScheduleId == oldScheduleId);

            if (movedSession == null)
            {
                movedSession = new ClassSession
                {
                    ClassId = classEntity.ClassId,
                    SessionDate = newDate,
                    ScheduleId = oldScheduleId,
                    Status = "Scheduled"
                };
                _context.ClassSessions.Add(movedSession);
            }
            else
            {
                movedSession.Status = "Scheduled";
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("[ApplySingleSessionChange] SUCCESS: Session {SessionId} moved from {OldDate} to {NewDate}",
                targetSession.SessionId, targetDate, newDate);
        }

        private static EducenAPI.DTOs.Classes.CreateScheduleSlotDto? ResolveTargetSlot(List<EducenAPI.DTOs.Classes.CreateScheduleSlotDto> slots, ParsedScheduleChangeRequest parsed)
        {
            // ƯU TIÊN 1: Khớp theo SlotId (ID chính xác từ DB)
            if (parsed.SlotId.HasValue)
            {
                var matchedById = slots.FirstOrDefault(s => s.Slot == parsed.SlotId.Value);
                if (matchedById != null) return matchedById;
            }

            // ƯU TIÊN 2: Khớp theo Thứ + Giờ (Dự phòng nếu giá trị ID bị sai lệch)
            if (parsed.CurrentDayOfWeek.HasValue && parsed.CurrentStartTime.HasValue && parsed.CurrentEndTime.HasValue)
            {
                var curStartStr = parsed.CurrentStartTime.Value.ToString("HH:mm");
                var curEndStr = parsed.CurrentEndTime.Value.ToString("HH:mm");
                
                var matchedByTime = slots.FirstOrDefault(s =>
                    s.DayOfWeek == parsed.CurrentDayOfWeek.Value &&
                    s.StartTime == curStartStr &&
                    s.EndTime == curEndStr);
                if (matchedByTime != null) return matchedByTime;
            }

            // ƯU TIÊN 3: Lấy slot đầu tiên nếu không tìm thấy (Tránh bị null)
            return slots.OrderBy(s => s.Slot).FirstOrDefault();
        }

        private static bool IsScheduleChangeRequest(SupportRequest request)
        {
            var title = (request.Title ?? string.Empty).ToLowerInvariant();
            var content = (request.Content ?? string.Empty).ToLowerInvariant();

            return title.Contains("[schedule_change]")
                || content.Contains("type: schedule_change")
                || title.Contains("đổi lịch dạy")
                || content.Contains("requestedslot:");
        }



        private static ParsedScheduleChangeRequest ParseScheduleChangeRequest(string content)
        {
            var parsed = new ParsedScheduleChangeRequest();
            if (string.IsNullOrWhiteSpace(content))
                return parsed;

            // Normalize content to simplify regex matching
            var normalized = content.Replace("\r\n", "\n").Replace("\r", "\n");

            // Parse ClassId from title or content (ID: \d+)
            var classMatch = Regex.Match(normalized, @"(?:ClassId|ID):\s*(\d+)", RegexOptions.IgnoreCase);
            if (classMatch.Success && int.TryParse(classMatch.Groups[1].Value, out var cId)) 
                parsed.ClassId = cId;

            // Parse SlotId from content (ID: \d+)
            var slotIdMatch = Regex.Match(normalized, @"(?:SlotId|ID):\s*(\d+)", RegexOptions.IgnoreCase);
            if (slotIdMatch.Success && int.TryParse(slotIdMatch.Groups[1].Value, out var sId))
                parsed.SlotId = sId;

            var requestedRoomMatch = Regex.Match(normalized, @"(?:RequestedRoomId|RoomId|PhòngId):\s*(\d+)", RegexOptions.IgnoreCase);
            if (!requestedRoomMatch.Success) 
            {
                // Fallback: Tim ID trong dau ngoac o bat ky dau
                requestedRoomMatch = Regex.Match(normalized, @"Phòng mới:.*\(ID:\s*(\d+)\)", RegexOptions.IgnoreCase);
            }

            if (requestedRoomMatch.Success && int.TryParse(requestedRoomMatch.Groups[1].Value, out var roomId))
                parsed.RequestedRoomId = roomId;

            // Robust slot extraction
            var currentSlot = ExtractSlot(normalized, @"(?:CurrentSlot|Slot hiện tại):\s*([^\(]+)\(([^)]+)\)");
            if (currentSlot.HasValue)
            {
                parsed.CurrentDayOfWeek = currentSlot.Value.DayOfWeek;
                parsed.CurrentStartTime = currentSlot.Value.Start;
                parsed.CurrentEndTime = currentSlot.Value.End;
            }

            var requestedSlot = ExtractSlot(normalized, @"(?:RequestedSlot|Slot mới|Slot đề xuất):\s*([^\(]+)\(([^)]+)\)");
            if (requestedSlot.HasValue)
            {
                parsed.NewDayOfWeek = requestedSlot.Value.DayOfWeek;
                parsed.NewStartTime = requestedSlot.Value.Start;
                parsed.NewEndTime = requestedSlot.Value.End;
            }

            // Parse ChangeType (full_schedule or single_session)
            var changeTypeMatch = Regex.Match(normalized, @"(?:ChangeType|Loại đổi):\s*(\w+)", RegexOptions.IgnoreCase);
            if (changeTypeMatch.Success)
            {
                parsed.ChangeType = changeTypeMatch.Groups[1].Value.ToLower();
            }
            else
            {
                // Default to full_schedule if not specified
                parsed.ChangeType = "full_schedule";
            }

            // Safety fallback:
            // if payload still carries "single_session" token anywhere (e.g. "Loại đổi: single_session")
            // but regex label parsing fails due content variations, force single_session to avoid changing full schedule.
            if (parsed.ChangeType == "full_schedule" &&
                normalized.Contains("single_session", StringComparison.OrdinalIgnoreCase))
            {
                parsed.ChangeType = "single_session";
            }

            // Parse TargetSessionDate for single session change
            if (parsed.ChangeType == "single_session")
            {
                var dateMatch = Regex.Match(normalized, @"(?:TargetSessionDate|Ngày đổi):\s*(\d{4}-\d{2}-\d{2})", RegexOptions.IgnoreCase);
                if (dateMatch.Success && DateTime.TryParseExact(dateMatch.Groups[1].Value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var targetDate))
                {
                    parsed.TargetSessionDate = targetDate;
                }
            }

            return parsed;
        }

        private static (int DayOfWeek, TimeOnly Start, TimeOnly End)? ExtractSlot(string content, string pattern)
        {
            var match = Regex.Match(content, pattern, RegexOptions.IgnoreCase);
            if (!match.Success) return null;

            var dayLabel = match.Groups[1].Value.Trim();
            var timeRange = match.Groups[2].Value.Trim();
            // Hỗ trợ nhiều loại dấu gạch ngang: -, –, —
            var parts = timeRange.Split(new[] { '-', '–', '—' }, StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
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
                IsReadByUser = x.IsRead,
                CreatedAt = x.CreatedAt,
                AdminResponse = x.AdminResponse,
            };
        }

        private sealed class ParsedScheduleChangeRequest
        {
            public int? ClassId { get; set; }
            public int? SlotId { get; set; }
            public int? RequestedRoomId { get; set; }
            public int? CurrentDayOfWeek { get; set; }
            public TimeOnly? CurrentStartTime { get; set; }
            public TimeOnly? CurrentEndTime { get; set; }
            public int? NewDayOfWeek { get; set; }
            public TimeOnly? NewStartTime { get; set; }
            public TimeOnly? NewEndTime { get; set; }
            public string ChangeType { get; set; } // "full_schedule" or "single_session"
            public DateTime? TargetSessionDate { get; set; } // For single session change
        }
    }
}