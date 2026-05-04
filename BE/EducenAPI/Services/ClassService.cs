using EducenAPI.DTOs.Classes;
using EducenAPI.DTOs.Students;
using EducenAPI.DTOs.Assignments;
using EducenAPI.DTOs.LessionMaterials;
using EducenAPI.DTOs.Submissions;
using EducenAPI.DTOs;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
using Microsoft.Extensions.DependencyInjection;

namespace EducenAPI.Services
{
    public class ImportStudentToClassResult
    {
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
    }

    public class ClassService : IClassService
    {

        private readonly EducenV2Context _context;
        private readonly IPaymentReminderService _notificationService;
        private readonly MailService _mailService;
        private readonly IServiceScopeFactory _scopeFactory;
        private const int MaxClassNameLength = 100;

        public ClassService(EducenV2Context context, IPaymentReminderService notificationService, MailService mailService, IServiceScopeFactory scopeFactory)
        {
            _context = context;
            _notificationService = notificationService;
            _mailService = mailService;
            _scopeFactory = scopeFactory;
        }

        public async Task<IEnumerable<ClassDto>> GetAllClassesAsync()
        {
            await UpdateExpiredClassesAsync();

            var today = DateTime.UtcNow.AddHours(7).Date;

            return await _context.Classes
                .Include(c => c.Subject)
                .Include(c => c.Teacher)
                    .ThenInclude(t => t!.TeacherNavigation)
                .Include(c => c.Assistant)
                    .ThenInclude(a => a!.AssistantNavigation)
                .Include(c => c.Room)
                .Include(c => c.Grade)
                .Include(c => c.Students)
                .Include(c => c.Schedules)
                    .ThenInclude(s => s.Room)
                .Include(c => c.Sessions)
                .Select(c => new ClassDto
                {
                    ClassId = c.ClassId,
                    ClassName = c.ClassName ?? "",
                    Description = c.Description,
                    SyllabusContent = c.SyllabusContent,
                    SubjectId = c.SubjectId,
                    SubjectName = c.Subject.SubjectName,
                    TeacherId = c.TeacherId,
                    TeacherName = c.Teacher != null ? c.Teacher.TeacherNavigation.FullName : null,
                    AssistantId = c.AssistantId,
                    AssistantName = c.Assistant != null ? c.Assistant.AssistantNavigation.FullName : null,
                    RoomId = c.RoomId,
                    RoomName = c.Room != null ? c.Room.RoomName : null,
                    GradeId = c.GradeId,
                    GradeName = c.Grade != null ? c.Grade.GradeName : null,
                    StartDate = c.StartDate,
                    EndDate = c.EndDate,
                    Status = c.Status,
                    StudentCount = c.Students.Count,
                    MaxStudents = c.MaxStudents,
                    TotalSessions = c.Sessions.Count,
                    CompletedSessions = c.Sessions.Count(s => s.Status == "Completed" || s.SessionDate < DateTime.Now),
                    CreatedAt = DateTime.Now,
                    PricePerSession = c.PricePerSession,
                    ScheduleSlots = c.Schedules
                        .Where(s => s.Sessions.Count != 1 && (!s.Sessions.Any() || 
                                    ((c.EndDate == null || c.EndDate >= today) 
                                        ? s.Sessions.Any(sess => sess.SessionDate >= today) 
                                        : s.Sessions.Any(sess => sess.SessionDate >= c.EndDate.Value.AddDays(-7)))))
                        .Select(s => new CreateScheduleSlotDto
                    {
                        Slot = s.ScheduleId,
                        DayOfWeek = s.DayOfWeek,
                        StartTime = s.StartTime.ToString("HH:mm"),
                        EndTime = s.EndTime.ToString("HH:mm"),
                        RoomId = s.RoomId,
                        RoomName = s.Room != null ? s.Room.RoomName : null
                    }).ToList()
                })
                .ToListAsync();
        }

        public async Task<ClassDto?> GetClassByIdAsync(int id)
        {
            await UpdateExpiredClassesAsync();

            var today = DateTime.UtcNow.AddHours(7).Date;

            return await _context.Classes
                .Include(c => c.Subject)
                .Include(c => c.Teacher)
                    .ThenInclude(t => t!.TeacherNavigation)
                .Include(c => c.Assistant)
                    .ThenInclude(a => a!.AssistantNavigation)
                .Include(c => c.Room)
                .Include(c => c.Grade)
                .Include(c => c.Students)
                .Include(c => c.Sessions)
                .Include(c => c.Schedules)
                    .ThenInclude(s => s.Room)
                .Include(c => c.Students)
                .Where(c => c.ClassId == id)
                .Select(c => new ClassDto
                {
                    ClassId = c.ClassId,
                    ClassName = c.ClassName ?? "",
                    Description = c.Description,
                    SyllabusContent = c.SyllabusContent,
                    SubjectId = c.SubjectId,
                    SubjectName = c.Subject.SubjectName,
                    TeacherId = c.TeacherId,
                    TeacherName = c.Teacher != null ? c.Teacher.TeacherNavigation.FullName : null,
                    AssistantId = c.AssistantId,
                    AssistantName = c.Assistant != null ? c.Assistant.AssistantNavigation.FullName : null,
                    RoomId = c.RoomId,
                    RoomName = c.Room != null ? c.Room.RoomName : null,
                    GradeId = c.GradeId,
                    GradeName = c.Grade != null ? c.Grade.GradeName : null,
                    StartDate = c.StartDate,
                    EndDate = c.EndDate,
                    Status = c.Status,
                    StudentCount = c.Students.Count,
                    MaxStudents = c.MaxStudents,
                    TotalSessions = c.Sessions.Count(s => s.Status != "Rescheduled"),
                    CompletedSessions = c.Sessions.Count(s => (s.Status == "Completed" || s.SessionDate < DateTime.Now) && s.Status != "Rescheduled"),
                    CreatedAt = DateTime.Now,
                    PricePerSession = c.PricePerSession,
                    ScheduleSlots = c.Schedules
                        .Where(s => s.Sessions.Count != 1 && (!s.Sessions.Any() || 
                                    ((c.EndDate == null || c.EndDate >= today) 
                                        ? s.Sessions.Any(sess => sess.SessionDate >= today) 
                                        : s.Sessions.Any(sess => sess.SessionDate >= c.EndDate.Value.AddDays(-7)))))
                        .Select(s => new CreateScheduleSlotDto
                    {
                        Slot = s.ScheduleId,
                        DayOfWeek = s.DayOfWeek,
                        StartTime = s.StartTime.ToString("HH:mm"),
                        EndTime = s.EndTime.ToString("HH:mm"),
                        RoomId = s.RoomId,
                        RoomName = s.Room != null ? s.Room.RoomName : null
                    }).ToList()
                })
                .FirstOrDefaultAsync();
        }

        public async Task<ClassDto> CreateClassAsync(CreateClassDto dto)
        {
            dto.ClassName = dto.ClassName?.Trim();
            if (string.IsNullOrWhiteSpace(dto.ClassName))
                throw new Exception("Class name cannot be empty.");
            if (dto.ClassName.Length > MaxClassNameLength)
                throw new Exception($"Class name cannot exceed {MaxClassNameLength} characters.");

            // Validate Subject exists
            var subject = await _context.Subjects.FindAsync(dto.SubjectId);
            if (subject == null)
                throw new Exception("Không tìm thấy môn học");

            // Validate Teacher exists (bắt buộc)
            var teacher = await _context.Teachers.FindAsync(dto.TeacherId);
            if (teacher == null)
                throw new Exception("Không tìm thấy giáo viên");

            // Check if teacher is already assigned to another active class at this time
            if (dto.ScheduleSlots != null && dto.ScheduleSlots.Any())
            {
                await ValidateTeacherAvailability(dto.TeacherId, dto.ScheduleSlots, dto.StartDate, dto.EndDate);
            }

            // Validate Assistant exists (if provided)
            if (dto.AssistantId.HasValue)
            {
                var assistant = await _context.Assistants.FindAsync(dto.AssistantId.Value);
                if (assistant == null)
                    throw new Exception("Không tìm thấy trợ giảng");
                
                // Check if assistant is already assigned to another active class at this time
                if (dto.ScheduleSlots != null && dto.ScheduleSlots.Any())
                {
                    await ValidateAssistantAvailability(dto.AssistantId.Value, dto.ScheduleSlots, dto.StartDate, dto.EndDate);
                }
            }

            // Validate Rooms for slots
            if (dto.ScheduleSlots != null && dto.ScheduleSlots.Any())
            {
                foreach (var slot in dto.ScheduleSlots)
                {
                    var roomId = slot.RoomId ?? dto.RoomId;
                    if (roomId.HasValue)
                    {
                        await ValidateRoomAvailability(roomId.Value, slot.DayOfWeek, slot.StartTime, slot.EndTime, dto.StartDate, dto.EndDate);
                        await ValidateRoomStatus(roomId.Value);
                    }
                }
            }
            else if (dto.RoomId.HasValue)
            {
                var room = await _context.Rooms.FindAsync(dto.RoomId.Value);
                if (room == null) throw new Exception("Không tìm thấy phòng học");
                if (!room.Status) throw new Exception($"Phòng '{room.RoomName}' đang bảo trì, không thể sử dụng");
            }

            // Validate date range
            if (dto.StartDate.HasValue && dto.EndDate.HasValue)
            {
                if (dto.StartDate > dto.EndDate)
                    throw new Exception("Ngày bắt đầu không thể lớn hơn ngày kết thúc");
                
                if (dto.StartDate < DateTime.Today)
                    throw new Exception("Ngày bắt đầu không thể nằm trong quá khứ");
            }

            // Validate ClassStatus
            var validStatuses = new[] { "Active", "Inactive", "Completed", "Cancelled" };
            if (dto.Status != null && !validStatuses.Contains(dto.Status))
                throw new Exception($"Trạng thái phải là một trong: {string.Join(", ", validStatuses)}");

            // Validate and create schedules
            if (dto.ScheduleSlots != null && dto.ScheduleSlots.Any())
            {
                ValidateScheduleSlots(dto.ScheduleSlots);
            }

            var newClass = new Class
            {
                ClassName = dto.ClassName,
                Description = dto.Description,
                SyllabusContent = dto.SyllabusContent,
                SubjectId = dto.SubjectId,
                TeacherId = dto.TeacherId,
                AssistantId = dto.AssistantId.HasValue && dto.AssistantId.Value > 0 ? dto.AssistantId : null,
                RoomId = dto.RoomId,
                GradeId = dto.GradeId,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Status = dto.Status ?? "Active",
                PricePerSession = dto.PricePerSession,
                MaxStudents = dto.MaxStudents
            };

            Console.WriteLine($"[DEBUG] CreateClassAsync: PricePerSession = {dto.PricePerSession}");

            // Use transaction for creating class with schedules
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Classes.Add(newClass);
                await _context.SaveChangesAsync();

                // Create schedules for this class (including ClassSession)
                if (dto.ScheduleSlots != null && dto.ScheduleSlots.Any())
                {
                    await CreateSchedulesForClass(newClass.ClassId, dto.RoomId, dto.ScheduleSlots, dto.StartDate, dto.EndDate);
                }

                await transaction.CommitAsync();

                // Send Email Notification in Background (Post-Commit) to avoid blocking
                if (newClass.TeacherId.HasValue || newClass.AssistantId.HasValue)
                {
                    var teacherId = newClass.TeacherId;
                    var assistantId = newClass.AssistantId;
                    var className = newClass.ClassName ?? "Lớp học mới";

                    _ = Task.Run(async () =>
                    {
                        using var scope = _scopeFactory.CreateScope();
                        var mailSvc = scope.ServiceProvider.GetRequiredService<MailService>();
                        var dbContext = scope.ServiceProvider.GetRequiredService<EducenV2Context>();

                        if (teacherId.HasValue)
                        {
                            try
                            {
                                var teacherWithUser = await dbContext.Teachers
                                    .Include(t => t.TeacherNavigation)
                                    .FirstOrDefaultAsync(t => t.UserId == teacherId.Value);

                                if (teacherWithUser?.TeacherNavigation?.Email != null)
                                {
                                    await mailSvc.SendTeacherClassAssignmentEmailAsync(
                                        teacherWithUser.TeacherNavigation.Email,
                                        teacherWithUser.TeacherNavigation.FullName ?? teacherWithUser.TeacherNavigation.Username,
                                        className
                                    );
                                }
                            }
                            catch (Exception ex) { Console.WriteLine($"Background Email Error (Teacher): {ex.Message}"); }
                        }

                        if (assistantId.HasValue)
                        {
                            try
                            {
                                var assistantWithUser = await dbContext.Assistants
                                    .Include(a => a.AssistantNavigation)
                                    .FirstOrDefaultAsync(a => a.UserId == assistantId.Value);

                                if (assistantWithUser?.AssistantNavigation?.Email != null)
                                {
                                    await mailSvc.SendAssistantClassAssignmentEmailAsync(
                                        assistantWithUser.AssistantNavigation.Email,
                                        assistantWithUser.AssistantNavigation.FullName ?? assistantWithUser.AssistantNavigation.Username,
                                        className
                                    );
                                }
                            }
                            catch (Exception ex) { Console.WriteLine($"Background Email Error (Assistant): {ex.Message}"); }
                        }
                    });
                }
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }

            return await GetClassByIdAsync(newClass.ClassId) ?? throw new Exception("Lỗi khi lấy thông tin lớp học vừa tạo");
        }

        private async Task ValidateTeacherAvailability(int teacherId, List<CreateScheduleSlotDto> scheduleSlots, DateTime? startDate, DateTime? endDate, int? excludeClassId = null)
        {
            var teacherClasses = await _context.Classes
                .Include(c => c.Schedules)
                .Where(c => c.TeacherId == teacherId && c.Status == "Active" && (excludeClassId == null || c.ClassId != excludeClassId))
                .ToListAsync();

            foreach (var existingClass in teacherClasses)
            {
                // Check date overlap
                if (startDate.HasValue && endDate.HasValue && existingClass.StartDate.HasValue && existingClass.EndDate.HasValue)
                {
                    if (startDate > existingClass.EndDate || endDate < existingClass.StartDate)
                        continue; // No date overlap
                }

                // Check schedule time overlap
                foreach (var newSlot in scheduleSlots)
                {
                    var newStart = TimeOnly.Parse(newSlot.StartTime);
                    var newEnd = TimeOnly.Parse(newSlot.EndTime);

                    foreach (var existingSlot in existingClass.Schedules.Where(s => s.DayOfWeek == newSlot.DayOfWeek))
                    {
                        if (newStart < existingSlot.EndTime && newEnd > existingSlot.StartTime)
                        {
                            throw new Exception($"Giáo viên đã được phân công cho lớp '{existingClass.ClassName}' trong khoảng thời gian này");
                        }
                    }
                }
            }
        }

        private async Task ValidateAssistantAvailability(int assistantId, List<CreateScheduleSlotDto> scheduleSlots, DateTime? startDate, DateTime? endDate, int? excludeClassId = null)
        {
            var assistantClasses = await _context.Classes
                .Include(c => c.Schedules)
                .Where(c => c.AssistantId == assistantId && c.Status == "Active" && (excludeClassId == null || c.ClassId != excludeClassId))
                .ToListAsync();

            foreach (var existingClass in assistantClasses)
            {
                // Check date overlap
                if (startDate.HasValue && endDate.HasValue && existingClass.StartDate.HasValue && existingClass.EndDate.HasValue)
                {
                    if (startDate > existingClass.EndDate || endDate < existingClass.StartDate)
                        continue;
                }

                // Check schedule time overlap
                foreach (var newSlot in scheduleSlots)
                {
                    var newStart = TimeOnly.Parse(newSlot.StartTime);
                    var newEnd = TimeOnly.Parse(newSlot.EndTime);

                    foreach (var existingSlot in existingClass.Schedules.Where(s => s.DayOfWeek == newSlot.DayOfWeek))
                    {
                        if (newStart < existingSlot.EndTime && newEnd > existingSlot.StartTime)
                        {
                            throw new Exception($"Trợ giảng đã được phân công cho lớp '{existingClass.ClassName}' trong khoảng thời gian này");
                        }
                    }
                }
            }
        }

        private async Task ValidateRoomAvailability(int roomId, int dayOfWeek, string startTimeStr, string endTimeStr, DateTime? startDate, DateTime? endDate, int? excludeClassId = null)
        {
            var startTime = TimeOnly.Parse(startTimeStr);
            var endTime = TimeOnly.Parse(endTimeStr);

            // Get day name for error message
            var dayNames = new[] { "Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7" };
            var dayName = dayNames[dayOfWeek];

            // Get room name for error message
            var room = await _context.Rooms.FindAsync(roomId);
            var roomName = room?.RoomName ?? $"Room {roomId}";

            // Check against ALL schedules in this room for active classes
            var conflictingSchedules = await _context.Schedules
                .Include(s => s.Class)
                .Where(s => s.RoomId == roomId && s.Class.Status == "Active" && (excludeClassId == null || s.ClassId != excludeClassId))
                .Where(s => s.DayOfWeek == dayOfWeek)
                .ToListAsync();

            foreach (var existingSlot in conflictingSchedules)
            {
                var existingClass = existingSlot.Class;
                var existingStartDate = existingClass.StartDate;
                var existingEndDate = existingClass.EndDate;

                // Check date overlap
                bool dateOverlaps;
                if (startDate.HasValue && endDate.HasValue && existingStartDate.HasValue && existingEndDate.HasValue)
                {
                    // Both have dates - check overlap
                    dateOverlaps = !(startDate > existingEndDate || endDate < existingStartDate);
                }
                else
                {
                    // One or both have null dates - always consider as overlap for strict validation
                    dateOverlaps = true;
                }

                // Check time overlap if dates overlap
                if (dateOverlaps && startTime < existingSlot.EndTime && endTime > existingSlot.StartTime)
                {
                    // Build detailed error message
                    var existingDayName = dayNames[existingSlot.DayOfWeek];
                    var dateRange = "";
                    
                    if (existingStartDate.HasValue && existingEndDate.HasValue)
                    {
                        dateRange = $" từ ngày {existingStartDate:dd/MM/yyyy} đến ngày {existingEndDate:dd/MM/yyyy}";
                    }
                    else if (!existingStartDate.HasValue && !existingEndDate.HasValue)
                    {
                        dateRange = " (không xác định)";
                    }
                    else if (existingStartDate.HasValue)
                    {
                        dateRange = $" từ ngày {existingStartDate:dd/MM/yyyy}";
                    }
                    else
                    {
                        dateRange = $" đến ngày {existingEndDate:dd/MM/yyyy}";
                    }

                    throw new Exception($"Phòng '{roomName}' đã được đặt bởi lớp '{existingClass.ClassName}' vào {existingDayName}, {existingSlot.StartTime}-{existingSlot.EndTime}{dateRange}");
                }
            }
        }

        private async Task ValidateRoomStatus(int roomId)
        {
            var room = await _context.Rooms.FindAsync(roomId);
            if (room == null) throw new Exception("Không tìm thấy phòng học");
            if (!room.Status) throw new Exception($"Phòng '{room.RoomName}' đang bảo trì, không thể sử dụng");
        }

        private void ValidateScheduleSlots(List<CreateScheduleSlotDto> scheduleSlots)
        {
            foreach (var slot in scheduleSlots)
            {
                // Validate DayOfWeek range
                if (slot.DayOfWeek < 0 || slot.DayOfWeek > 6)
                    throw new Exception("Ngày trong tuần phải từ 0 đến 6");

                // Validate time format
                if (!TimeOnly.TryParse(slot.StartTime, out var startTime))
                    throw new Exception($"Định dạng thời gian bắt đầu không hợp lệ: {slot.StartTime}");
                
                if (!TimeOnly.TryParse(slot.EndTime, out var endTime))
                    throw new Exception($"Định dạng thời gian kết thúc không hợp lệ: {slot.EndTime}");

                // Validate time order and minimum duration (1.5 hours)
                if (startTime >= endTime)
                    throw new Exception("Thời gian kết thúc phải lớn hơn thời gian bắt đầu");

                if ((endTime - startTime).TotalMinutes < 60)
                    throw new Exception("Mỗi buổi học phải kéo dài ít nhất 60 phút");
            }

            // Check for duplicate slots
            var duplicateSlots = scheduleSlots
                .GroupBy(s => new { s.DayOfWeek, s.StartTime, s.EndTime })
                .Where(g => g.Count() > 1)
                .ToList();

            if (duplicateSlots.Any())
                throw new Exception("Phát hiện các khung giờ học bị trùng lặp");

            // Check for overlapping slots on same day
            var slotsByDay = scheduleSlots.GroupBy(s => s.DayOfWeek);
            foreach (var daySlots in slotsByDay)
            {
                var timeSlots = daySlots.Select(s => new {
                    StartTime = TimeOnly.Parse(s.StartTime),
                    EndTime = TimeOnly.Parse(s.EndTime)
                }).ToList();

                for (int i = 0; i < timeSlots.Count; i++)
                {
                    for (int j = i + 1; j < timeSlots.Count; j++)
                    {
                        var slot1 = timeSlots[i];
                        var slot2 = timeSlots[j];

                        // Check for overlap
                        if ((slot1.StartTime < slot2.EndTime && slot1.EndTime > slot2.StartTime))
                            throw new Exception("Thời gian học bị trùng lặp với một lịch học khác trong cùng ngày");
                    }
                }
            }
        }

        /// <summary>
        /// Generate session dates between startDate and endDate based on dayOfWeek
        /// FIX: Bao gồm TẤT CẢ các ngày trong khoảng thời gian khớp với dayOfWeek
        /// </summary>
        private List<DateTime> GenerateSessionDates(DateTime startDate, DateTime endDate, int dayOfWeek)
        {
            var dates = new List<DateTime>();
            var currentDate = startDate.Date;

            // ✅ FIX: Duyệt qua TẤT CẢ các ngày trong khoảng startDate → endDate
            // Nếu ngày đó khớp với dayOfWeek → thêm vào danh sách
            while (currentDate <= endDate.Date)
            {
                if ((int)currentDate.DayOfWeek == dayOfWeek)
                {
                    dates.Add(currentDate);
                }
                currentDate = currentDate.AddDays(1);
            }

            return dates;
        }

        private async Task CreateSchedulesForClass(int classId, int? defaultRoomId, List<CreateScheduleSlotDto> scheduleSlots, DateTime? startDate, DateTime? endDate)
        {
            foreach (var slot in scheduleSlots)
            {
                var schedule = new Schedule
                {
                    ClassId = classId,
                    DayOfWeek = slot.DayOfWeek,
                    StartTime = TimeOnly.Parse(slot.StartTime),
                    EndTime = TimeOnly.Parse(slot.EndTime),
                    RoomId = slot.RoomId ?? defaultRoomId // Fallback to default room if not specified per slot
                };
                _context.Schedules.Add(schedule);
                await _context.SaveChangesAsync();

                // ✅ Tự động tạo ClassSession nếu có startDate và endDate
                if (startDate.HasValue && endDate.HasValue && startDate.Value <= endDate.Value)
                {
                    var sessionDates = GenerateSessionDates(startDate.Value, endDate.Value, slot.DayOfWeek);
                    var nowVn = DateTime.UtcNow.AddHours(7);
                    var today = nowVn.Date;
                    var currentTime = TimeOnly.FromDateTime(nowVn);
                    
                    foreach (var sessionDate in sessionDates)
                    {
                        // ✅ FIX: Chỉ tạo buổi học từ hôm nay trở đi. Nếu là hôm nay, phải sau giờ hiện tại.
                        if (sessionDate.Date < today) continue;
                        if (sessionDate.Date == today && TimeOnly.Parse(slot.StartTime) < currentTime) continue;

                        // ✅ FIX: Tránh tạo trùng session (cùng ngày, cùng giờ)
                        var startTime = TimeOnly.Parse(slot.StartTime);
                        var exists = await _context.ClassSessions
                            .Include(s => s.Schedule)
                            .AnyAsync(s => s.ClassId == classId && s.SessionDate == sessionDate && s.Schedule.StartTime == startTime);

                        if (exists) continue;

                        var classSession = new ClassSession
                        {
                            ClassId = classId,
                            ScheduleId = schedule.ScheduleId,
                            SessionDate = sessionDate,
                            Status = "Scheduled"
                        };
                        _context.ClassSessions.Add(classSession);
                    }
                }
            }
            await _context.SaveChangesAsync();
        }

        private async Task GenerateSessionsForClass(int classId, DateTime startDate, DateTime endDate, List<Schedule> schedules)
        {
            var nowVn = DateTime.UtcNow.AddHours(7);
            var today = nowVn.Date;
            var currentTime = TimeOnly.FromDateTime(nowVn);

            for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
            {
                var dayOfWeek = (int)date.DayOfWeek;
                var matchingSchedule = schedules.FirstOrDefault(s => s.DayOfWeek == dayOfWeek);
                if (matchingSchedule != null)
                {
                    // ✅ FIX: Chỉ tạo buổi học từ hôm nay trở đi. Nếu là hôm nay, phải sau giờ hiện tại.
                    if (date < today) continue;
                    if (date == today && matchingSchedule.StartTime < currentTime) continue;

                    _context.ClassSessions.Add(new ClassSession
                    {
                        ClassId = classId,
                        ScheduleId = matchingSchedule.ScheduleId,
                        SessionDate = date,
                        Status = "Scheduled"
                    });
                }
            }
            await _context.SaveChangesAsync();
        }

        public async Task<bool> UpdateClassAsync(int id, UpdateClassDto dto)
        {
            var existingClass = await _context.Classes
                .Include(c => c.Schedules)
                    .ThenInclude(s => s.Sessions)
                        .ThenInclude(sess => sess.Attendances)
                .Include(c => c.Schedules)
                    .ThenInclude(s => s.Sessions)
                        .ThenInclude(sess => sess.Assignments)
                .Include(c => c.Schedules)
                    .ThenInclude(s => s.Sessions)
                        .ThenInclude(sess => sess.LessonMaterials)
                .AsSplitQuery() // FIX: Avoid cartesian product and fix EF Core loading error
                .FirstOrDefaultAsync(c => c.ClassId == id);
                
            if (existingClass == null)
                return false;

            EnsureClassNotEnded(existingClass, "chỉnh sửa");
            var classHasStarted = HasClassStarted(existingClass);

            // Use transaction for updating class and schedules
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                if (dto.ClassName != null)
                {
                    var normalizedClassName = dto.ClassName.Trim();
                    if (string.IsNullOrWhiteSpace(normalizedClassName))
                        throw new Exception("Class name cannot be empty.");
                    if (normalizedClassName.Length > MaxClassNameLength)
                        throw new Exception($"Class name cannot exceed {MaxClassNameLength} characters.");
                    existingClass.ClassName = normalizedClassName;
                }

                if (dto.Description != null)
                    existingClass.Description = dto.Description;

                if (dto.SyllabusContent != null)
                    existingClass.SyllabusContent = dto.SyllabusContent;

                if (dto.SubjectId.HasValue)
                {
                    var subject = await _context.Subjects.FindAsync(dto.SubjectId.Value);
                    if (subject == null)
                        throw new Exception("Không tìm thấy môn học");
                    existingClass.SubjectId = dto.SubjectId.Value;
                }

                int? oldTeacherId = existingClass.TeacherId;
                if (dto.TeacherId.HasValue)
                {
                    var teacher = await _context.Teachers.FindAsync(dto.TeacherId.Value);
                    if (teacher == null)
                        throw new Exception("Không tìm thấy giáo viên");
                    
                    // Validate teacher availability if changing teacher or updating schedules
                    if (existingClass.TeacherId != dto.TeacherId.Value || dto.ScheduleSlots != null)
                    {
                        var scheduleSlots = dto.ScheduleSlots ?? existingClass.Schedules.Select(s => new CreateScheduleSlotDto
                        {
                            Slot = s.ScheduleId,
                            DayOfWeek = s.DayOfWeek,
                            StartTime = s.StartTime.ToString("HH:mm"),
                            EndTime = s.EndTime.ToString("HH:mm")
                        }).ToList();
                        
                        await ValidateTeacherAvailability(dto.TeacherId.Value, scheduleSlots, dto.StartDate ?? existingClass.StartDate, dto.EndDate ?? existingClass.EndDate, id);
                    }
                    existingClass.TeacherId = dto.TeacherId;
                }

                // Send email if teacher changed and is not null
                if (existingClass.TeacherId.HasValue && existingClass.TeacherId != oldTeacherId)
                {
                    try
                    {
                        var teacherWithUser = await _context.Teachers
                            .Include(t => t.TeacherNavigation)
                            .FirstOrDefaultAsync(t => t.UserId == existingClass.TeacherId.Value);

                        if (teacherWithUser?.TeacherNavigation?.Email != null)
                        {
                            await _mailService.SendTeacherClassAssignmentEmailAsync(
                                teacherWithUser.TeacherNavigation.Email,
                                teacherWithUser.TeacherNavigation.FullName ?? teacherWithUser.TeacherNavigation.Username,
                                existingClass.ClassName ?? "Lớp học"
                            );
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error sending teacher update email: {ex.Message}");
                    }
                }

                int? oldAssistantId = existingClass.AssistantId;
                if (dto.AssistantId.HasValue)
                {
                    var assistant = await _context.Assistants.FindAsync(dto.AssistantId.Value);
                    if (assistant == null)
                        throw new Exception("Không tìm thấy trợ giảng");
                    
                    // Validate assistant availability if changing assistant or updating schedules
                    if (existingClass.AssistantId != dto.AssistantId.Value || dto.ScheduleSlots != null)
                    {
                        var scheduleSlots = dto.ScheduleSlots ?? existingClass.Schedules.Select(s => new CreateScheduleSlotDto
                        {
                            Slot = s.ScheduleId,
                            DayOfWeek = s.DayOfWeek,
                            StartTime = s.StartTime.ToString("HH:mm"),
                            EndTime = s.EndTime.ToString("HH:mm")
                        }).ToList();
                        
                        await ValidateAssistantAvailability(dto.AssistantId.Value, scheduleSlots, dto.StartDate ?? existingClass.StartDate, dto.EndDate ?? existingClass.EndDate, id);
                    }
                    existingClass.AssistantId = dto.AssistantId;
                }

                // Send email if assistant changed and is not null
                if (existingClass.AssistantId.HasValue && existingClass.AssistantId != oldAssistantId)
                {
                    try
                    {
                        var assistantWithUser = await _context.Assistants
                            .Include(a => a.AssistantNavigation)
                            .FirstOrDefaultAsync(a => a.UserId == existingClass.AssistantId.Value);

                        if (assistantWithUser?.AssistantNavigation?.Email != null)
                        {
                            await _mailService.SendAssistantClassAssignmentEmailAsync(
                                assistantWithUser.AssistantNavigation.Email,
                                assistantWithUser.AssistantNavigation.FullName ?? assistantWithUser.AssistantNavigation.Username,
                                existingClass.ClassName ?? "Lớp học"
                            );
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error sending assistant update email: {ex.Message}");
                    }
                }

                if (dto.RoomId.HasValue || dto.ScheduleSlots != null)
                {
                    var roomIdToValidate = dto.RoomId ?? existingClass.RoomId;
                    var slotsToValidate = dto.ScheduleSlots ?? existingClass.Schedules.Select(s => new CreateScheduleSlotDto
                    {
                        Slot = s.ScheduleId,
                        DayOfWeek = s.DayOfWeek,
                        StartTime = s.StartTime.ToString("HH:mm"),
                        EndTime = s.EndTime.ToString("HH:mm"),
                        RoomId = s.RoomId
                    }).ToList();

                    foreach (var slot in slotsToValidate)
                    {
                        var targetRoomId = slot.RoomId ?? roomIdToValidate;
                        if (targetRoomId.HasValue)
                        {
                            await ValidateRoomAvailability(targetRoomId.Value, slot.DayOfWeek, slot.StartTime, slot.EndTime, dto.StartDate ?? existingClass.StartDate, dto.EndDate ?? existingClass.EndDate, id);
                            await ValidateRoomStatus(targetRoomId.Value);
                        }
                    }
                    
                    if (dto.RoomId.HasValue)
                        existingClass.RoomId = dto.RoomId.Value;
                }

                // Validate Room status when only RoomId is provided without schedule slots
                if (dto.RoomId != null && dto.ScheduleSlots == null)
                {
                    await ValidateRoomStatus(dto.RoomId.Value);
                }

                if (dto.GradeId != null)
                {
                    var grade = await _context.Grades.FindAsync(dto.GradeId);
                    if (grade == null)
                        throw new Exception("Không tìm thấy khối/lớp");
                    existingClass.GradeId = dto.GradeId;
                }

                if (dto.StartDate.HasValue)
                {
                    if (classHasStarted && existingClass.StartDate.HasValue && dto.StartDate.Value.Date != existingClass.StartDate.Value.Date)
                        throw new Exception("Lớp đã bắt đầu học, không thể chỉnh sửa ngày bắt đầu.");

                    existingClass.StartDate = dto.StartDate;
                }

                if (dto.EndDate.HasValue)
                    existingClass.EndDate = dto.EndDate;

                if (dto.Status != null)
                {
                    var validStatuses = new[] { "Active", "Inactive", "Completed", "Cancelled" };
                    if (!validStatuses.Contains(dto.Status))
                        throw new Exception($"Trạng thái phải là một trong: {string.Join(", ", validStatuses)}");
                    existingClass.Status = dto.Status;
                }

                if (dto.MaxStudents.HasValue)
                {
                    if (dto.MaxStudents.Value < existingClass.Students.Count)
                        throw new Exception($"Sĩ số tối đa không thể nhỏ hơn số học sinh hiện có ({existingClass.Students.Count})");
                    existingClass.MaxStudents = dto.MaxStudents.Value;
                }

                if (dto.PricePerSession.HasValue)
                {
                    // Chỉ kiểm tra nếu giá thực sự thay đổi
                    if (existingClass.PricePerSession != dto.PricePerSession.Value)
                    {
                        if (classHasStarted)
                            throw new Exception("Lớp đã bắt đầu học, không thể chỉnh sửa đơn giá theo buổi.");

                        Console.WriteLine($"[DEBUG] UpdateClassAsync: PricePerSession = {dto.PricePerSession}");
                        existingClass.PricePerSession = dto.PricePerSession;
                    }
                }

                // ✅ FIX: Xử lý 2 trường hợp riêng biệt:
                // 1) Admin đổi hoặc gửi ScheduleSlots: kiểm tra thay đổi lịch
                // 2) Kể cả khi lịch không đổi, nếu ngày bắt đầu/kết thúc đổi -> tái tạo session
                bool scheduleSlotsChanged = false;

                if (dto.ScheduleSlots != null)
                {
                    // Fill default RoomId before comparison
                    foreach (var slot in dto.ScheduleSlots)
                    {
                        if (slot.RoomId == null)
                        {
                            slot.RoomId = dto.RoomId ?? existingClass.RoomId;
                        }
                    }

                    var existingSlots = existingClass.Schedules.Where(s => s.Sessions.Count != 1).Select(s => new CreateScheduleSlotDto
                    {
                        Slot = s.ScheduleId,
                        DayOfWeek = s.DayOfWeek,
                        StartTime = s.StartTime.ToString("HH:mm"),
                        EndTime = s.EndTime.ToString("HH:mm"),
                        RoomId = s.RoomId
                    }).ToList();

                    if (!AreScheduleSlotsEqual(dto.ScheduleSlots, existingSlots))
                    {
                        scheduleSlotsChanged = true;

                        var finalStartDate = existingClass.StartDate;
                        var finalEndDate   = existingClass.EndDate;
                        var nowVn          = DateTime.UtcNow.AddHours(7);
                        var today          = nowVn.Date;
                        var currentTime    = TimeOnly.FromDateTime(nowVn);

                        var oldSchedIds = existingClass.Schedules.Select(s => s.ScheduleId).ToList();
                        var keptSessionIds = new HashSet<int>();

                        if (oldSchedIds.Any())
                        {
                            // Tìm các buổi học cần giữ lại:
                            // 1. Đã qua (Ngày < Hôm nay HOẶC Ngày == Hôm nay và Giờ < Hiện tại)
                            // 2. Có dữ liệu (Bài tập, Tài liệu)
                            // 3. Status != Scheduled
                            var sessionIdsWithData = await _context.ClassSessions
                                .Where(s => oldSchedIds.Contains(s.ScheduleId) &&
                                    (s.SessionDate.Date < today ||
                                     (s.SessionDate.Date == today && s.Schedule.StartTime < currentTime) ||
                                     s.Assignments.Any() ||
                                     s.LessonMaterials.Any() ||
                                     s.Status != "Scheduled"))
                                .Select(s => s.SessionId)
                                .ToListAsync();

                            var invoicedIds = await _context.TuitionInvoiceItems
                                .Where(x => sessionIdsWithData.Contains(x.SessionId))
                                .Select(x => x.SessionId)
                                .Distinct()
                                .ToListAsync();

                            keptSessionIds = sessionIdsWithData.Union(invoicedIds).ToHashSet();
                        }

                        // Tao new schedules
                        var newSchedules = new List<Schedule>();
                        foreach (var slot in dto.ScheduleSlots)
                        {
                            var ns = new Schedule
                            {
                                ClassId   = id,
                                DayOfWeek = slot.DayOfWeek,
                                StartTime = TimeOnly.Parse(slot.StartTime),
                                EndTime   = TimeOnly.Parse(slot.EndTime),
                                RoomId    = slot.RoomId ?? (dto.RoomId ?? existingClass.RoomId)
                            };
                            _context.Schedules.Add(ns);
                            newSchedules.Add(ns);
                        }
                        await _context.SaveChangesAsync();

                        // Giữ nguyên các session quá khứ - không reassign vào schedule mới
                        // Tìm các schedules cũ có session quá khứ cần giữ lại
                        var oldScheduleIdsWithPastSessions = new HashSet<int>();
                        if (keptSessionIds.Any())
                        {
                            oldScheduleIdsWithPastSessions = (await _context.ClassSessions
                                .Where(s => keptSessionIds.Contains(s.SessionId))
                                .Select(s => s.ScheduleId)
                                .Distinct()
                                .ToListAsync())
                                .ToHashSet();
                        }

                        // Identify one-off schedules to protect them (Sessions.Count == 1)
                        var oneOffScheduleIds = existingClass.Schedules.Where(s => s.Sessions.Count == 1).Select(s => s.ScheduleId).ToList();
                        
                        // Exclude one-offs from the list of schedules whose future sessions will be purged
                        var schedIdsToPurgeSessions = oldSchedIds.Except(oneOffScheduleIds).ToList();

                        // Xóa sessions tương lai từ schedules cũ (trừ các slot đổi 1 buổi)
                        if (schedIdsToPurgeSessions.Any())
                        {
                            var purgeIdsParam = string.Join(",", schedIdsToPurgeSessions);
                            await _context.Database.ExecuteSqlRawAsync(
                                $"DELETE FROM ClassSessions WHERE ScheduleId IN ({purgeIdsParam}) AND SessionDate >= CAST(GETDATE() AS DATE) AND Status = 'Scheduled'");
                        }

                        // Xóa các schedules cũ KHÔNG có session quá khứ VÀ KHÔNG phải là một buổi đổi lẻ
                        var schedulesToDelete = oldSchedIds.Except(oldScheduleIdsWithPastSessions).Except(oneOffScheduleIds).ToList();
                        if (schedulesToDelete.Any())
                        {
                            var schedulesToDeleteParam = string.Join(",", schedulesToDelete);
                            await _context.Database.ExecuteSqlRawAsync(
                                $"DELETE FROM Schedules WHERE ScheduleId IN ({schedulesToDeleteParam})");
                        }

                        // Refresh context sau raw SQL để đảm bảo dữ liệu đồng bộ
                        _context.ChangeTracker.Clear();

                        // Tao session moi theo lich moi
                        if (finalStartDate.HasValue && finalEndDate.HasValue)
                        {
                            // Query lại các session còn lại (chỉ session quá khứ được giữ)
                            var existingKeptDates = await _context.ClassSessions
                                .AsNoTracking()
                                .Where(s => s.ClassId == id)
                                .Select(s => s.SessionDate)
                                .ToListAsync();

                            foreach (var ns in newSchedules)
                            {
                                var dates = GenerateSessionDates(finalStartDate.Value, finalEndDate.Value, ns.DayOfWeek);
                                foreach (var d in dates)
                                {
                                    // ✅ FIX: Chỉ tạo buổi học từ hôm nay trở đi. Nếu là hôm nay, phải sau giờ hiện tại.
                                    if (d.Date < today) continue;
                                    if (d.Date == today && ns.StartTime < currentTime) continue;

                                    // ✅ FIX: Check duplicate by SessionDate only, not ScheduleId (new schedules have different IDs)
                                    if (existingKeptDates.Any(e => e.Date == d.Date)) continue;
                                    _context.ClassSessions.Add(new ClassSession
                                    {
                                        ClassId     = id,
                                        ScheduleId  = ns.ScheduleId,
                                        SessionDate = d,
                                        Status      = "Scheduled"
                                    });
                                }
                            }
                            await _context.SaveChangesAsync();
                        }
                    }
                }

                // Nếu lịch học không đổi NHƯNG ngày đổi (hoặc vừa đổi cả hai)
                // Hoặc trường hợp Admin chỉ gửi ngày mà không gửi ScheduleSlots
                if (!scheduleSlotsChanged && (dto.StartDate.HasValue || dto.EndDate.HasValue))
                {
                    var finalStartDate = existingClass.StartDate;
                    var finalEndDate   = existingClass.EndDate;

                    if (finalStartDate.HasValue && finalEndDate.HasValue && existingClass.Schedules.Any())
                    {
                        var nowVn = DateTime.UtcNow.AddHours(7);
                        var today = nowVn.Date;
                        var currentTime = TimeOnly.FromDateTime(nowVn);

                        var existingSessionsBySchedule = await _context.ClassSessions
                            .Where(s => s.ClassId == id)
                            .Select(s => new { s.SessionId, s.SessionDate, s.ScheduleId })
                            .ToListAsync();

                        var sessionIdsOutOfRange = await _context.ClassSessions
                            .Include(s => s.Assignments)
                            .Include(s => s.LessonMaterials)
                            .Where(s => s.ClassId == id
                                     && (s.SessionDate.Date < finalStartDate.Value.Date || s.SessionDate.Date > finalEndDate.Value.Date)
                                     && s.SessionDate.Date >= today)
                            .ToListAsync();

                        var sessionIdsOutOfRangeBase = sessionIdsOutOfRange.Select(s => s.SessionId).ToList();

                        // Tìm các buổi học đã có hóa đơn
                        var invoicedSessionIds = await _context.TuitionInvoiceItems
                            .Where(tii => sessionIdsOutOfRangeBase.Contains(tii.SessionId))
                            .Select(tii => tii.SessionId)
                            .Distinct()
                            .ToListAsync();

                        var safeToRemove = sessionIdsOutOfRange
                            .Where(s => !s.Assignments.Any() 
                                     && !s.LessonMaterials.Any()
                                     && !invoicedSessionIds.Contains(s.SessionId))
                            .ToList();

                        if (safeToRemove.Any())
                        {
                            var removeIds = safeToRemove.Select(s => s.SessionId).ToList();

                            // 1. Xóa các yêu cầu sửa điểm danh liên quan
                            var requestsToDelete = await _context.AttendanceModificationRequests
                                .Where(r => removeIds.Contains(r.SessionId))
                                .ToListAsync();
                            if (requestsToDelete.Any())
                                _context.AttendanceModificationRequests.RemoveRange(requestsToDelete);

                            // 2. Xóa dữ liệu điểm danh
                            var attToDelete = await _context.Attendances
                                .Where(a => removeIds.Contains(a.SessionId))
                                .ToListAsync();
                            if (attToDelete.Any())
                                _context.Attendances.RemoveRange(attToDelete);

                            // 3. Xóa buổi học
                            _context.ClassSessions.RemoveRange(safeToRemove);
                            await _context.SaveChangesAsync();
                        }

                        var existingDates = existingSessionsBySchedule
                            .Select(s => new { s.SessionDate.Date, s.ScheduleId })
                            .ToHashSet();

                        foreach (var schedule in existingClass.Schedules.Where(s => s.Sessions.Count != 1))
                        {
                            var newDates = GenerateSessionDates(finalStartDate.Value, finalEndDate.Value, schedule.DayOfWeek);
                            foreach (var d in newDates)
                            {
                                // ✅ FIX: Chỉ tạo buổi học từ hôm nay trở đi khi đổi ngày bắt đầu/kết thúc
                                if (d.Date < today) continue;
                                if (d.Date == today && schedule.StartTime < currentTime) continue;

                                // Chỗ này quan trọng: dùng d.Date để so sánh
                                if (existingDates.Any(e => e.Date == d.Date && e.ScheduleId == schedule.ScheduleId)) continue;
                                _context.ClassSessions.Add(new ClassSession
                                {
                                    ClassId     = id,
                                    ScheduleId  = schedule.ScheduleId,
                                    SessionDate = d,
                                    Status      = "Scheduled"
                                });
                            }
                        }
                        await _context.SaveChangesAsync();
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                if (existingClass.TeacherId.HasValue)
                {
                    await _notificationService.CreateSystemNotificationAsync(new CreateNotificationRequest
                    {
                        TenantId = _context.CurrentTenantId,
                        UserId = existingClass.TeacherId.Value,
                        TargetRole = "Teacher",
                        Title = "Lớp học đã được cập nhật",
                        Message = $"Thông tin lớp {existingClass.ClassName} đã được cập nhật.",
                        Type = "Info",
                        Category = "Class",
                        ReferenceId = existingClass.ClassId.ToString(),
                        ReferenceType = "Class",
                        IsInApp = true
                    });
                }

                return true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> DeleteClassAsync(int id)
        {
            var existingClass = await _context.Classes
                .Include(c => c.Students)
                .Include(c => c.Schedules)
                    .ThenInclude(s => s.Sessions)
                .FirstOrDefaultAsync(c => c.ClassId == id);

            if (existingClass == null)
                return false;

            EnsureClassNotEnded(existingClass, "xóa");

            if (existingClass.Students.Any())
                throw new Exception("Không thể xóa lớp học: lớp đang có học viên tham gia");

            // ✅ FIX: Xóa ClassSessions và Attendances trước khi xóa Schedules
            foreach (var schedule in existingClass.Schedules)
            {
                if (schedule.Sessions != null && schedule.Sessions.Any())
                {
                    // ✅ FIX: Load Attendances và xóa trước
                    var sessionIds = schedule.Sessions.Select(s => s.SessionId).ToList();
                    var attendancesToDelete = _context.Attendances
                        .Where(a => sessionIds.Contains(a.SessionId))
                        .ToList();

                    if (attendancesToDelete.Any())
                    {
                        _context.Attendances.RemoveRange(attendancesToDelete);
                    }

                    _context.ClassSessions.RemoveRange(schedule.Sessions);
                }
            }

            // Xóa Schedules
            foreach (var s in existingClass.Schedules) { if (s.Sessions != null) s.Sessions.Clear(); }
            _context.Schedules.RemoveRange(existingClass.Schedules);

            // Xóa Class
            _context.Classes.Remove(existingClass);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> AssignTeacherAsync(int classId, int teacherId)
        {
            var existingClass = await _context.Classes.FindAsync(classId);
            if (existingClass == null)
                return false;

            EnsureClassNotEnded(existingClass, "phân công giáo viên");

            var teacher = await _context.Teachers.FindAsync(teacherId);
            if (teacher == null)
                throw new Exception("Không tìm thấy giáo viên");

            existingClass.TeacherId = teacherId;
            await _context.SaveChangesAsync();

            await _notificationService.CreateSystemNotificationAsync(new CreateNotificationRequest
            {
                TenantId = _context.CurrentTenantId,
                UserId = teacherId,
                TargetRole = "Teacher",
                Title = "Phân công giảng dạy",
                Message = $"Bạn đã được phân công dạy lớp {existingClass.ClassName}.",
                Type = "Success",
                Category = "Class",
                ReferenceId = existingClass.ClassId.ToString(),
                ReferenceType = "Class",
                IsInApp = true
            });

            return true;
        }

        public async Task<bool> AssignAssistantAsync(int classId, int assistantId)
        {
            var existingClass = await _context.Classes.FindAsync(classId);
            if (existingClass == null)
                return false;

            EnsureClassNotEnded(existingClass, "phân công trợ giảng");

            var assistant = await _context.Assistants.FindAsync(assistantId);
            if (assistant == null)
                throw new Exception("Không tìm thấy trợ giảng");

            existingClass.AssistantId = assistantId;
            await _context.SaveChangesAsync();

            // Send Email Notification in Background
            if (assistantId > 0)
            {
                var className = existingClass.ClassName ?? "Lớp học";
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var scope = _scopeFactory.CreateScope();
                        var mailSvc = scope.ServiceProvider.GetRequiredService<MailService>();
                        var dbContext = scope.ServiceProvider.GetRequiredService<EducenV2Context>();

                        var assistantWithUser = await dbContext.Assistants
                            .Include(a => a.AssistantNavigation)
                            .FirstOrDefaultAsync(a => a.UserId == assistantId);

                        if (assistantWithUser?.AssistantNavigation?.Email != null)
                        {
                            await mailSvc.SendAssistantClassAssignmentEmailAsync(
                                assistantWithUser.AssistantNavigation.Email,
                                assistantWithUser.AssistantNavigation.FullName ?? assistantWithUser.AssistantNavigation.Username,
                                className
                            );
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Background Email Error (AssignAssistant): {ex.Message}");
                    }
                });
            }

            return true;
        }
   
           private bool IsTimeOverlap(TimeOnly start1, TimeOnly end1, TimeOnly start2, TimeOnly end2)
        {
            return start1 < end2 && start2 < end1;
        }

        public async Task<bool> IsScheduleConflictingAsync(int studentId, int classId)
        {
            // Lấy lịch của lớp học mục tiêu
            var targetClassSchedules = await _context.Schedules
                .Where(s => s.ClassId == classId)
                .ToListAsync();

            if (!targetClassSchedules.Any()) return false;

            // Lấy toàn bộ lịch của học sinh từ các lớp đã gán (chỉ tính các lớp đang hoạt động)
            var studentSchedules = await _context.Schedules
                .Include(s => s.Class)
                .ThenInclude(c => c.Students)
                .Where(s => s.Class.Students.Any(stu => stu.UserId == studentId) && s.Class.Status == "Active")
                .ToListAsync();

            foreach (var target in targetClassSchedules)
            {
                foreach (var existing in studentSchedules)
                {
                    // So sánh: Cùng ngày và có khoảng thời gian giao nhau
                    if (target.DayOfWeek == existing.DayOfWeek)
                    {
                        if (IsTimeOverlap(target.StartTime, target.EndTime, existing.StartTime, existing.EndTime))
                        {
                            return true;
                        }
                    }
                }
            }

            return false;
        }

        public async Task<bool> IsClassFullAsync(int classId)
        {
            var cls = await _context.Classes
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.ClassId == classId);

            if (cls == null) return false;

            // Nếu MaxStudents <= 0 coi như không giới hạn
            if (cls.MaxStudents <= 0) return false;

            return cls.Students.Count >= cls.MaxStudents;
        }

        public async Task<bool> AddStudentToClassAsync(int classId, int studentId)
        {
            var existingClass = await _context.Classes
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.ClassId == classId);

            if (existingClass == null)
                return false;

            EnsureClassNotEnded(existingClass, "thêm học sinh");

            var student = await _context.Students.FindAsync(studentId);
            if (student == null)
                throw new Exception("Không tìm thấy học sinh");

            if (existingClass.Students.Any(s => s.UserId == studentId))
                throw new Exception("Học sinh này đã tham gia lớp học này");

            // Kiểm tra sĩ số & trùng lịch
            if (await IsClassFullAsync(classId))
            {
                throw new Exception("Lớp học đã đầy sĩ số tối đa.");
            }

            if (await IsScheduleConflictingAsync(studentId, classId))
            {
                throw new Exception("Lịch học của học sinh bị trùng với lịch của lớp học này.");
            }

            existingClass.Students.Add(student);
            await _context.SaveChangesAsync();

            // Send Email Notification in Background
            if (studentId > 0)
            {
                var className = existingClass.ClassName ?? "Lớp học mới";
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var scope = _scopeFactory.CreateScope();
                        var mailSvc = scope.ServiceProvider.GetRequiredService<MailService>();
                        var dbContext = scope.ServiceProvider.GetRequiredService<EducenV2Context>();

                        var studentWithUser = await dbContext.Students
                            .Include(s => s.StudentNavigation)
                            .FirstOrDefaultAsync(s => s.UserId == studentId);

                        if (studentWithUser?.StudentNavigation?.Email != null)
                        {
                            await mailSvc.SendStudentClassEnrollmentEmailAsync(
                                studentWithUser.StudentNavigation.Email,
                                studentWithUser.StudentNavigation.FullName ?? studentWithUser.StudentNavigation.Username,
                                className
                            );
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Background Email Error (AddStudentToClass): {ex.Message}");
                    }
                });
            }

            return true;
        }

        public async Task<bool> RemoveStudentFromClassAsync(int classId, int studentId)
        {
            var existingClass = await _context.Classes
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.ClassId == classId);

            if (existingClass == null)
                return false;

            EnsureClassNotEnded(existingClass, "xóa học sinh");

            var student = existingClass.Students.FirstOrDefault(s => s.UserId == studentId);
            if (student == null)
                throw new Exception("Học sinh này không tham gia lớp học này");

            existingClass.Students.Remove(student);
            await _context.SaveChangesAsync();
            return true;
        }

        private bool AreScheduleSlotsEqual(List<CreateScheduleSlotDto> newSlots, List<CreateScheduleSlotDto> existingSlots)
        {
            if (newSlots.Count != existingSlots.Count) return false;

            // Sort both lists to ensure consistent comparison
            var sortedNew = newSlots.OrderBy(s => s.DayOfWeek).ThenBy(s => s.StartTime).ThenBy(s => s.EndTime).ToList();
            var sortedExisting = existingSlots.OrderBy(s => s.DayOfWeek).ThenBy(s => s.StartTime).ThenBy(s => s.EndTime).ToList();

            for (int i = 0; i < sortedNew.Count; i++)
            {
                var n = sortedNew[i];
                var e = sortedExisting[i];

                if (n.DayOfWeek != e.DayOfWeek ||
                    NormalizeTime(n.StartTime) != NormalizeTime(e.StartTime) ||
                    NormalizeTime(n.EndTime) != NormalizeTime(e.EndTime) ||
                    n.RoomId != e.RoomId)
                {
                    return false;
                }
            }
            return true;
        }

        private string NormalizeTime(string time)
        {
            if (string.IsNullOrEmpty(time)) return "";
            if (TimeOnly.TryParse(time, out var t))
            {
                return t.ToString("HH:mm");
            }
            return time;
        }

        public async Task<bool> ClassExistsAsync(int id)
        {
            return await _context.Classes.AnyAsync(c => c.ClassId == id);
        }

        public async Task<ImportStudentToClassResult> ImportStudentToClassAsync(int classId, CreateStudentDto studentDto)
        {
            // Look up the existing student by username
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == studentDto.Username);

            if (user == null)
                return new ImportStudentToClassResult { Success = false, ErrorMessage = $"Học sinh với username '{studentDto.Username}' chưa có trong hệ thống." };

            // Make sure this user is actually a Student
            var student = await _context.Students.FirstOrDefaultAsync(s => s.UserId == user.UserId);
            if (student == null)
                return new ImportStudentToClassResult { Success = false, ErrorMessage = $"Tài khoản '{studentDto.Username}' không phải học sinh." };

            // Get the class (include students for duplicate check)
            var existingClass = await _context.Classes
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.ClassId == classId);

            if (existingClass == null)
                return new ImportStudentToClassResult { Success = false, ErrorMessage = "Lớp học không tồn tại." };

            if (IsClassEnded(existingClass))
                return new ImportStudentToClassResult { Success = false, ErrorMessage = "Lớp đã kết thúc, không thể thao tác thêm học sinh." };

            // Check if student already in class
            if (existingClass.Students.Any(s => s.UserId == student.UserId))
                return new ImportStudentToClassResult { Success = false, ErrorMessage = $"Học sinh '{studentDto.Username}' đã có trong lớp." };

            existingClass.Students.Add(student);
            await _context.SaveChangesAsync();

            // Send Email Notification in Background
            if (student.UserId > 0)
            {
                var className = existingClass.ClassName ?? "Lớp học mới";
                var studentUserId = student.UserId;
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var scope = _scopeFactory.CreateScope();
                        var mailSvc = scope.ServiceProvider.GetRequiredService<MailService>();
                        var dbContext = scope.ServiceProvider.GetRequiredService<EducenV2Context>();

                        var studentWithUser = await dbContext.Students
                            .Include(s => s.StudentNavigation)
                            .FirstOrDefaultAsync(s => s.UserId == studentUserId);

                        if (studentWithUser?.StudentNavigation?.Email != null)
                        {
                            await mailSvc.SendStudentClassEnrollmentEmailAsync(
                                studentWithUser.StudentNavigation.Email,
                                studentWithUser.StudentNavigation.FullName ?? studentWithUser.StudentNavigation.Username,
                                className
                            );
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Background Email Error (ImportStudentToClass): {ex.Message}");
                    }
                });
            }

            return new ImportStudentToClassResult { Success = true };
        }

        public async Task<IEnumerable<StudentDto>> GetStudentsByClassIdAsync(int classId)
        {
            var today = DateTime.UtcNow.AddHours(7).Date;
            var pastSessionsCount = await _context.ClassSessions
                .CountAsync(s => s.ClassId == classId && s.SessionDate <= today);

            var students = await _context.Classes
                .Where(c => c.ClassId == classId)
                .SelectMany(c => c.Students)
                .Select(s => new
                {
                    s.UserId,
                    UserEmail = s.StudentNavigation != null ? s.StudentNavigation.Email : null,
                    s.Grade,
                    s.EnrollmentStatus,
                    UserUsername = s.StudentNavigation != null ? s.StudentNavigation.Username : null,
                    UserFullName = s.StudentNavigation != null ? s.StudentNavigation.FullName : null,
                    UserPhone = s.StudentNavigation != null ? s.StudentNavigation.PhoneNumber : null,
                    UserStatus = s.StudentNavigation != null ? s.StudentNavigation.AccountStatus : null,
                    // Calculate Average Score
                    AverageScore = _context.Submissions
                        .Where(sub => sub.StudentId == s.UserId && sub.Asm.Session.ClassId == classId && sub.Score.HasValue)
                        .Average(sub => (double?)sub.Score) ?? 0,
                    // Calculate Attendance Rate
                    PresentCount = _context.Attendances
                        .Count(a => a.StudentId == s.UserId && a.Session.ClassId == classId && a.Status == "present")
                })
                .ToListAsync();

            return students.Select(s => new StudentDto
            {
                UserId = s.UserId,
                Username = s.UserUsername ?? "",
                FullName = s.UserFullName ?? "",
                Email = s.UserEmail ?? "",
                PhoneNumber = s.UserPhone,
                Grade = s.Grade ?? "—",
                AverageScore = s.AverageScore > 0 ? s.AverageScore.ToString("F1") : "—",
                AttendanceRate = pastSessionsCount > 0 
                    ? (int)Math.Round((double)s.PresentCount / pastSessionsCount * 100) 
                    : 0,
                EnrollmentStatus = s.EnrollmentStatus ?? "",
                AccountStatus = s.UserStatus ?? "",
                CreatedAt = DateTime.Now
            }).ToList();
        }

        public async Task<IEnumerable<SessionResponseDto>> GetSessionsByClassIdAsync(int classId)
        {
            var sessions = await _context.ClassSessions
                .Include(s => s.Schedule)
                    .ThenInclude(sc => sc!.Room)
                .Include(s => s.Class)
                    .ThenInclude(c => c!.Room)
                .Where(s => (s.ClassId == classId || (s.Schedule != null && s.Schedule.ClassId == classId)) && s.Status != "Rescheduled")
                .OrderBy(s => s.SessionDate)
                .ToListAsync();

            var dayLabels = new[] { "Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy" };

            return sessions.Select(s => new SessionResponseDto
            {
                SessionId = s.SessionId,
                ScheduleId = s.ScheduleId,
                SessionDate = s.SessionDate,
                Status = s.Status,
                DayLabel = dayLabels[(int)s.SessionDate.DayOfWeek],
                Time = s.Schedule != null ? $"{s.Schedule.StartTime:HH:mm} - {s.Schedule.EndTime:HH:mm}" : "N/A",
                Title = $"Buổi {sessions.IndexOf(s) + 1}: Ngày {s.SessionDate:dd/MM/yyyy}",
                RoomName = s.Schedule?.Room?.RoomName ?? s.Class?.Room?.RoomName
            }).ToList();
        }

        public async Task<StudentClassDetailDto?> GetStudentClassDetailAsync(int studentId, int classId, string baseUrl)
        {
            var classInfo = await GetClassByIdAsync(classId);
            if (classInfo == null) return null;

            var sessions = await _context.ClassSessions
                .Include(s => s.Schedule)
                    .ThenInclude(sc => sc!.Room)
                .Include(s => s.Class)
                    .ThenInclude(c => c!.Room)
                .Include(s => s.LessonMaterials)
                .Include(s => s.Assignments)
                    .ThenInclude(a => a.Submissions.Where(sub => sub.StudentId == studentId))
                .Include(s => s.Attendances.Where(att => att.StudentId == studentId))
                .Where(s => s.ClassId == classId && s.Status != "Rescheduled")
                .OrderBy(s => s.SessionDate)
                .ToListAsync();

            var dayLabels = new[] { "Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy" };

            var result = new StudentClassDetailDto
            {
                ClassInfo = classInfo,
                Sessions = sessions.Select((s, index) => {
                    var studentAttendance = s.Attendances.FirstOrDefault();
                    var effectiveStatus = s.Status;
                    if (studentAttendance != null)
                    {
                        if (studentAttendance.Status == "present") effectiveStatus = "Attended";
                        else if (studentAttendance.Status == "absent") effectiveStatus = "Absent";
                    }

                    return new StudentSessionDto
                    {
                        SessionId = s.SessionId,
                        ScheduleId = s.ScheduleId,
                        SessionDate = s.SessionDate,
                        Status = effectiveStatus,
                        DayLabel = dayLabels[(int)s.SessionDate.DayOfWeek],
                        Time = s.Schedule != null ? $"{s.Schedule.StartTime:HH:mm} - {s.Schedule.EndTime:HH:mm}" : "N/A",
                        Title = $"Buổi {index + 1}: Ngày {s.SessionDate:dd/MM/yyyy}",
                        RoomName = s.Schedule?.Room?.RoomName ?? s.Class?.Room?.RoomName,
                        Materials = s.LessonMaterials.Select(m => new MaterialResponseDto
                        {
                            MaterialId = m.MaterialId,
                            Title = m.Title,
                            FileUrl = !string.IsNullOrEmpty(m.FileUrl) 
                                ? $"{baseUrl}/{m.FileUrl.Replace("\\", "/").Replace("wwwroot/", "")}" 
                                : null,
                            ContentType = m.ContentType
                        }).ToList(),
                        Assignments = s.Assignments.Select(a => new StudentAssignmentDto
                        {
                            AsmId = a.AsmId,
                            Title = a.Title ?? string.Empty,
                            Description = a.Description ?? string.Empty,
                            DueDate = a.EndTime,
                            FileUrl = !string.IsNullOrEmpty(a.FileUrl)
                                ? $"{baseUrl}/{a.FileUrl.Replace("\\", "/").Replace("wwwroot/", "")}"
                                : null,
                            CurrentSubmission = a.Submissions.Select(sub => {
                                var fileUrls = new List<string>();
                                if (!string.IsNullOrEmpty(sub.FileUrl))
                                {
                                    var paths = sub.FileUrl.Split(';', StringSplitOptions.RemoveEmptyEntries);
                                    foreach (var p in paths)
                                    {
                                        fileUrls.Add($"{baseUrl}/{p.Replace("\\", "/").Replace("wwwroot/", "")}");
                                    }
                                }
                                return new SubmissionResponseDto
                                {
                                    SubId = sub.SubId,
                                    AsmId = sub.AsmId,
                                    StudentId = sub.StudentId,
                                    FileUrl = fileUrls.FirstOrDefault(),
                                    FileUrls = fileUrls,
                                    SubmittedAt = sub.SubmittedAt,
                                    Status = sub.Status,
                                    Score = sub.Score,
                                    TeacherComment = sub.TeacherComment,
                                    GradedAt = sub.GradedAt,
                                    IsPublished = sub.IsPublished
                                };
                            }).FirstOrDefault()
                        }).ToList()
                    };
                }).ToList()
            };

            return result;
        }

        public async Task<IEnumerable<StudentClassListItemDto>> GetStudentClassesAsync(int studentId)
        {
            await UpdateExpiredClassesAsync();

            var classes = await _context.Classes
                .Include(c => c.Students)
                .Include(c => c.Subject)
                .Include(c => c.Grade)
                .Include(c => c.Teacher!).ThenInclude(t => t.TeacherNavigation)
                .Include(c => c.Assistant!).ThenInclude(a => a.AssistantNavigation)
                .Include(c => c.Schedules)
                .Include(c => c.Sessions)
                .Where(c => c.Students.Any(s => s.UserId == studentId))
                .ToListAsync();

            return classes.Select(c =>
            {
                var scheduleDays = string.Join(" & ", c.Schedules.Select(s => {
                     var days = new[] { "CN", "T2", "T3", "T4", "T5", "T6", "T7" };
                     return (int)s.DayOfWeek < days.Length ? days[(int)s.DayOfWeek] : "N/A";
                }));
                
                var scheduleTime = c.Schedules.FirstOrDefault() != null 
                    ? $"{c.Schedules.First().StartTime:HH:mm} - {c.Schedules.First().EndTime:HH:mm}" 
                    : "N/A";

                return new StudentClassListItemDto
                {
                    ClassId = c.ClassId,
                    ClassName = c.ClassName ?? "N/A",
                    SubjectName = c.Subject?.SubjectName ?? "N/A",
                    GradeLevel = c.Grade?.GradeName ?? "N/A",
                    Status = c.Status ?? "Active",
                    TeacherName = c.Teacher?.TeacherNavigation?.FullName ?? "Chưa có GV",
                    AssistantName = c.Assistant?.AssistantNavigation?.FullName,
                    TeacherInitials = GetInitials(c.Teacher?.TeacherNavigation?.FullName),
                    AssistantInitials = GetInitials(c.Assistant?.AssistantNavigation?.FullName),
                    ScheduleDays = scheduleDays,
                    ScheduleTime = scheduleTime,
                    TotalSessions = c.Sessions.Count(s => s.Status != "Rescheduled"),
                    CompletedSessions = c.Sessions.Count(s => (s.Status == "Completed" || s.SessionDate < DateTime.Now) && s.Status != "Rescheduled"),
                    Color = GetSubjectColor(c.Subject?.SubjectName),
                    StartDate = c.StartDate,
                    EndDate = c.EndDate
                };
            }).ToList();
        }

        public async Task<IEnumerable<ClassDto>> GetClassesByTeacherIdAsync(int userId)
        {
            await UpdateExpiredClassesAsync();

            return await _context.Classes
                .Include(c => c.Subject)
                .Include(c => c.Teacher)
                    .ThenInclude(t => t!.TeacherNavigation)
                .Include(c => c.Assistant)
                    .ThenInclude(a => a!.AssistantNavigation)
                .Include(c => c.Room)
                .Include(c => c.Grade)
                .Include(c => c.Students)
                .Include(c => c.Schedules)
                    .ThenInclude(s => s.Room)
                .Where(c => c.TeacherId == userId || c.AssistantId == userId)
                .Select(c => new ClassDto
                {
                    ClassId = c.ClassId,
                    ClassName = c.ClassName ?? "",
                    Description = c.Description,
                    SyllabusContent = c.SyllabusContent,
                    SubjectId = c.SubjectId,
                    SubjectName = c.Subject.SubjectName,
                    TeacherId = c.TeacherId,
                    TeacherName = c.Teacher != null ? c.Teacher.TeacherNavigation.FullName : null,
                    AssistantId = c.AssistantId,
                    AssistantName = c.Assistant != null ? c.Assistant.AssistantNavigation.FullName : null,
                    RoomId = c.RoomId,
                    RoomName = c.Room != null ? c.Room.RoomName : null,
                    GradeId = c.GradeId,
                    GradeName = c.Grade != null ? c.Grade.GradeName : null,
                    StartDate = c.StartDate,
                    EndDate = c.EndDate,
                    Status = c.Status,
                    StudentCount = c.Students.Count,
                    MaxStudents = c.MaxStudents,
                    TotalSessions = c.Sessions.Count(s => s.Status != "Rescheduled"),
                    CompletedSessions = c.Sessions.Count(s => (s.Status == "Completed" || s.SessionDate < DateTime.Now) && s.Status != "Rescheduled"),
                    CreatedAt = DateTime.Now,
                    PricePerSession = c.PricePerSession,
                    ScheduleSlots = c.Schedules.Select(s => new CreateScheduleSlotDto
                    {
                        Slot = s.ScheduleId,
                        DayOfWeek = s.DayOfWeek,
                        StartTime = s.StartTime.ToString("HH:mm"),
                        EndTime = s.EndTime.ToString("HH:mm"),
                        RoomId = s.RoomId,
                        RoomName = s.Room != null ? s.Room.RoomName : null
                    }).ToList()
                })
                .ToListAsync();
        }

        private string GetInitials(string? fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName)) return "??";
            var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) return "??";
            if (parts.Length == 1) return parts[0].Substring(0, Math.Min(2, parts[0].Length)).ToUpper();
            return (parts[0][0].ToString() + parts[parts.Length - 1][0].ToString()).ToUpper();
        }

        private string GetSubjectColor(string? subjectName)
        {
            if (string.IsNullOrEmpty(subjectName)) return "#64748b";
            var lower = subjectName.ToLower();
            if (lower.Contains("toán")) return "#3b82f6";
            if (lower.Contains("tiếng anh") || lower.Contains("ngoại ngữ")) return "#10b981";
            if (lower.Contains("vật lý")) return "#f59e0b";
            if (lower.Contains("hóa học")) return "#8b5cf6";
            if (lower.Contains("sinh học")) return "#ec4899";
            return "#3b82f6";
        }

        private async Task UpdateExpiredClassesAsync()
        {
            var today = DateTime.Today;
            var expiredClasses = await _context.Classes
                .Where(c => c.Status == "Active" && c.EndDate.HasValue && c.EndDate.Value.Date < today)
                .ToListAsync();

            if (expiredClasses.Any())
            {
                foreach (var c in expiredClasses)
                {
                    c.Status = "Completed";
                }
                
                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error auto-completing classes: {ex.Message}");
                }
            }
        }
        public async Task<bool> UpdateClassPriceAsync(int classId, decimal price)
        {
            var existingClass = await _context.Classes.FindAsync(classId);
            if (existingClass == null) return false;

            EnsureClassNotEnded(existingClass, "cập nhật đơn giá");
            if (existingClass.PricePerSession != price)
            {
                if (HasClassStarted(existingClass))
                    throw new Exception("Lớp đã bắt đầu học, không thể chỉnh sửa đơn giá theo buổi.");
            }

            existingClass.PricePerSession = price;
            await _context.SaveChangesAsync();
            return true;
        }

        private static DateTime GetVietnamToday()
        {
            return DateTime.UtcNow.AddHours(7).Date;
        }

        private static bool IsClassEnded(EducenAPI.Models.Class classEntity)
        {
            if (classEntity == null) return false;

            if (string.Equals(classEntity.Status, "Completed", StringComparison.OrdinalIgnoreCase)
                || string.Equals(classEntity.Status, "Cancelled", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            var today = GetVietnamToday();
            return classEntity.EndDate.HasValue && classEntity.EndDate.Value.Date < today;
        }

        private static bool HasClassStarted(EducenAPI.Models.Class classEntity)
        {
            if (classEntity == null || !classEntity.StartDate.HasValue)
            {
                return false;
            }

            var today = GetVietnamToday();
            return classEntity.StartDate.Value.Date < today;
        }

        private static void EnsureClassNotEnded(EducenAPI.Models.Class classEntity, string action)
        {
            if (IsClassEnded(classEntity))
            {
                throw new Exception($"Lớp đã kết thúc, không thể {action}.");
            }
        }
    }
}