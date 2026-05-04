using EducenAPI.DTOs.Schedules;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class ScheduleService : IScheduleService
    {
        private readonly EducenV2Context _context;
        private readonly IPaymentReminderService _notificationService;

        public ScheduleService(EducenV2Context context, IPaymentReminderService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        private DateTime GetNextScheduleDate(int scheduleDayOfWeek)
        {
            var today = DateTime.Today;
            int currentDayOfWeek = (int)today.DayOfWeek;
            
            int daysToAdd = scheduleDayOfWeek - currentDayOfWeek;
            if (daysToAdd <= 0)
                daysToAdd += 7;
                
            return today.AddDays(daysToAdd);
        }

        /// <summary>
        /// Maps a Schedule entity to ScheduleDto - refactored to eliminate duplicate code
        /// </summary>
        private static ScheduleDto MapToScheduleDto(Schedule s)
        {
            return new ScheduleDto
            {
                ScheduleId = s.ScheduleId,
                ClassId = s.ClassId,
                ClassName = s.Class?.ClassName ?? "",
                SubjectId = s.Class?.SubjectId ?? 0,
                SubjectName = s.Class?.Subject?.SubjectName ?? "",
                DayOfWeek = s.DayOfWeek,
                ScheduleDate = GetNextScheduleDateStatic(s.DayOfWeek),
                StartTime = s.StartTime.ToTimeSpan(),
                EndTime = s.EndTime.ToTimeSpan(),
                StartDate = s.Class?.StartDate,
                EndDate = s.Class?.EndDate,
                TeacherName = s.Class?.Teacher?.TeacherNavigation?.FullName,
                Notes = null,
                Status = "Active",
                CreatedAt = DateTime.Now,
                // Room information: Prefer specific slot room, fallback to class default room
                RoomId = s.RoomId ?? s.Class?.RoomId,
                RoomName = s.Room?.RoomName ?? s.Class?.Room?.RoomName
            };
        }

        /// <summary>
        /// Static version of GetNextScheduleDate for use in mapping
        /// </summary>
        private static DateTime GetNextScheduleDateStatic(int scheduleDayOfWeek)
        {
            var today = DateTime.Today;
            int currentDayOfWeek = (int)today.DayOfWeek;
            
            int daysToAdd = scheduleDayOfWeek - currentDayOfWeek;
            if (daysToAdd <= 0)
                daysToAdd += 7;
                
            return today.AddDays(daysToAdd);
        }

        public async Task<IEnumerable<ScheduleDto>> GetAllSchedulesAsync()
        {
            var schedules = await _context.Schedules
                .Include(s => s.Sessions) // NEW
                .Include(s => s.Room)
                .Include(s => s.Class)
                    .ThenInclude(c => c.Teacher)
                        .ThenInclude(t => t!.TeacherNavigation)
                .Include(s => s.Class)
                    .ThenInclude(c => c.Subject)
                .Include(s => s.Class)
                    .ThenInclude(c => c.Room)
                .ToListAsync();

            return schedules
                .Where(s => s.Sessions.Count != 1) // Filter out one-off schedules
                .Select(MapToScheduleDto);
        }

        public async Task<IEnumerable<ScheduleDto>> GetSchedulesByClassIdAsync(int classId)
        {
            var schedules = await _context.Schedules
                .Include(s => s.Sessions) // NEW
                .Include(s => s.Room)
                .Include(s => s.Class)
                    .ThenInclude(c => c.Subject)
                .Include(s => s.Class)
                    .ThenInclude(c => c.Room)
                .Where(s => s.ClassId == classId)
                .ToListAsync();

            return schedules
                .Where(s => s.Sessions.Count != 1) // Filter out one-off schedules
                .Select(MapToScheduleDto);
        }

        public async Task<ScheduleDto?> GetScheduleByIdAsync(int id)
        {
            var schedule = await _context.Schedules
                .Include(s => s.Room)
                .Include(s => s.Class)
                    .ThenInclude(c => c.Subject)
                .Include(s => s.Class)
                    .ThenInclude(c => c.Room)
                .FirstOrDefaultAsync(s => s.ScheduleId == id);

            return schedule != null ? MapToScheduleDto(schedule) : null;
        }

        public async Task<ScheduleDto> CreateScheduleAsync(CreateScheduleDto dto)
        {
            // Validate class exists
            var classExists = await _context.Classes
                .Include(c => c.Teacher)
                .FirstOrDefaultAsync(c => c.ClassId == dto.ClassId);
            if (classExists == null)
                throw new Exception("Lớp học không tồn tại.");

            // Validate class is active
            if (classExists.Status != "Active")
                throw new Exception("Lớp học không hoạt động.");

            // Validate schedule date is not in the past
            if (dto.ScheduleDate.Date < DateTime.Today)
                throw new Exception("Lịch học không thể ở quá khứ.");

            // Validate start time is not in the past for today
            if (dto.ScheduleDate.Date == DateTime.Today && dto.StartTime < DateTime.Now.TimeOfDay)
                throw new Exception("Thời gian bắt đầu không thể ở quá khứ.");

            // Validate time order
            if (dto.StartTime >= dto.EndTime)
                throw new Exception("Thời gian kết thúc phải sau thời gian bắt đầu.");

            if ((dto.EndTime - dto.StartTime).TotalMinutes < 60)
                throw new Exception("Thời gian buổi học tối thiểu phải là 60 phút.");

            // Validate room exists if RoomId is provided
            if (dto.RoomId.HasValue && dto.RoomId.Value > 0)
            {
                var roomExists = await _context.Rooms.AnyAsync(r => r.RoomId == dto.RoomId.Value);
                if (!roomExists)
                    throw new Exception("Phòng học không tồn tại.");
            }

            // Check for time overlap with existing schedules for same class
            var dayOfWeek = (int)dto.ScheduleDate.DayOfWeek;
            var existingSchedules = await _context.Schedules
                .Where(s => s.ClassId == dto.ClassId && s.DayOfWeek == dayOfWeek)
                .ToListAsync();

            foreach (var existing in existingSchedules)
            {
                var existingStart = existing.StartTime.ToTimeSpan();
                var existingEnd = existing.EndTime.ToTimeSpan();

                // Check for overlap
                if ((dto.StartTime < existingEnd && dto.EndTime > existingStart))
                    throw new Exception("Thời gian học bị trùng với lịch học đã có.");
            }

            // Check for teacher conflict with other classes
            if (classExists.TeacherId.HasValue)
            {
                var teacherClasses = await _context.Classes
                    .Include(c => c.Schedules)
                    .Where(c => c.TeacherId == classExists.TeacherId 
                        && c.ClassId != dto.ClassId 
                        && c.Status == "Active")
                    .ToListAsync();

                var newStart = TimeOnly.FromTimeSpan(dto.StartTime);
                var newEnd = TimeOnly.FromTimeSpan(dto.EndTime);

                foreach (var otherClass in teacherClasses)
                {
                    foreach (var existingSlot in otherClass.Schedules.Where(s => s.DayOfWeek == dayOfWeek))
                    {
                        if (newStart < existingSlot.EndTime && newEnd > existingSlot.StartTime)
                        {
                            throw new Exception($"Giáo viên đã được phân công cho lớp '{otherClass.ClassName}' trong khoảng thời gian này");
                        }
                    }
                }
            }

            // Check for room conflict with other classes
            if (classExists.RoomId.HasValue)
            {
                var roomClasses = await _context.Classes
                    .Include(c => c.Schedules)
                    .Where(c => c.RoomId == classExists.RoomId 
                        && c.ClassId != dto.ClassId 
                        && c.Status == "Active")
                    .ToListAsync();

                var newStart = TimeOnly.FromTimeSpan(dto.StartTime);
                var newEnd = TimeOnly.FromTimeSpan(dto.EndTime);

                foreach (var otherClass in roomClasses)
                {
                    foreach (var existingSlot in otherClass.Schedules.Where(s => s.DayOfWeek == (int)dto.ScheduleDate.DayOfWeek))
                    {
                        if (newStart < existingSlot.EndTime && newEnd > existingSlot.StartTime)
                        {
                            throw new Exception($"Phòng đã được đặt bởi lớp '{otherClass.ClassName}' trong khoảng thời gian này");
                        }
                    }
                }
            }

            var schedule = new Schedule
            {
                ClassId = dto.ClassId,
                DayOfWeek = dayOfWeek,
                StartTime = TimeOnly.FromTimeSpan(dto.StartTime),
                EndTime = TimeOnly.FromTimeSpan(dto.EndTime),
                RoomId = dto.RoomId
            };

            _context.Schedules.Add(schedule);
            await _context.SaveChangesAsync();

            return await GetScheduleByIdAsync(schedule.ScheduleId) ?? throw new Exception("Không thể lấy thông tin lịch học vừa tạo.");
        }

        public async Task<bool> UpdateScheduleAsync(int id, UpdateScheduleDto dto)
        {
            var schedule = await _context.Schedules
                .Include(s => s.Class)
                .FirstOrDefaultAsync(s => s.ScheduleId == id);
                
            if (schedule == null)
                return false;

            // Store old values for validation
            var oldDayOfWeek = schedule.DayOfWeek;
            var oldStartTime = schedule.StartTime;
            var oldEndTime = schedule.EndTime;

            // Apply updates
            if (dto.ScheduleDate.HasValue)
                schedule.DayOfWeek = (int)dto.ScheduleDate.Value.DayOfWeek;

            if (dto.StartTime.HasValue)
                schedule.StartTime = TimeOnly.FromTimeSpan(dto.StartTime.Value);

            if (dto.EndTime.HasValue)
                schedule.EndTime = TimeOnly.FromTimeSpan(dto.EndTime.Value);

            // ✅ FIX: Validate time order
            if (schedule.StartTime >= schedule.EndTime)
                throw new Exception("Thời gian bắt đầu phải trước thời gian kết thúc.");

            if ((schedule.EndTime - schedule.StartTime).TotalMinutes < 60)
                throw new Exception("Thời gian buổi học tối thiểu phải là 60 phút.");

            // ✅ FIX: Validate overlap with other schedules in same class
            var newDayOfWeek = schedule.DayOfWeek;
            var newStartTime = schedule.StartTime;
            var newEndTime = schedule.EndTime;

            var existingSchedules = await _context.Schedules
                .Where(s => s.ClassId == schedule.ClassId && s.ScheduleId != id)
                .ToListAsync();

            foreach (var existing in existingSchedules)
            {
                // Check if same day and time overlap
                if (existing.DayOfWeek == newDayOfWeek)
                {
                    if (newStartTime < existing.EndTime && newEndTime > existing.StartTime)
                    {
                        throw new Exception($"Thời gian học bị trùng với lịch học hiện có vào ngày thứ {existing.DayOfWeek}");
                    }
                }
            }

            // ✅ FIX: Validate teacher conflict with other classes
            if (schedule.Class != null && schedule.Class.TeacherId.HasValue)
            {
                var teacherClasses = await _context.Classes
                    .Include(c => c.Schedules)
                    .Where(c => c.TeacherId == schedule.Class.TeacherId 
                        && c.ClassId != schedule.ClassId 
                        && c.Status == "Active")
                    .ToListAsync();

                foreach (var otherClass in teacherClasses)
                {
                    foreach (var existingSlot in otherClass.Schedules)
                    {
                        if (existingSlot.DayOfWeek == newDayOfWeek)
                        {
                            if (newStartTime < existingSlot.EndTime && newEndTime > existingSlot.StartTime)
                            {
                                throw new Exception($"Giáo viên đã được phân công cho lớp '{otherClass.ClassName}' trong khoảng thời gian này");
                            }
                        }
                    }
                }
            }

            await _context.SaveChangesAsync();

            var className = schedule.Class?.ClassName ?? "";
            await _notificationService.SendToClassTeachersAsync(schedule.ClassId, new CreateRoleNotificationRequest
            {
                TenantId = _context.CurrentTenantId,
                Title = "Lịch học đã cập nhật",
                Message = $"Lịch học của lớp {className} đã được cập nhật.",
                Type = "Info",
                Category = "Schedule",
                ReferenceId = schedule.ScheduleId.ToString(),
                ReferenceType = "Schedule"
            });

            await _notificationService.SendToClassStudentsAsync(schedule.ClassId, new CreateRoleNotificationRequest
            {
                TenantId = _context.CurrentTenantId,
                Title = "Lịch học đã cập nhật",
                Message = $"Lịch học của lớp {className} đã được cập nhật.",
                Type = "Info",
                Category = "Schedule",
                ReferenceId = schedule.ScheduleId.ToString(),
                ReferenceType = "Schedule"
            });

            await _notificationService.SendToClassParentsAsync(schedule.ClassId, new CreateRoleNotificationRequest
            {
                TenantId = _context.CurrentTenantId,
                Title = "Lịch học đã cập nhật",
                Message = $"Lịch học của lớp {className} đã được cập nhật.",
                Type = "Info",
                Category = "Schedule",
                ReferenceId = schedule.ScheduleId.ToString(),
                ReferenceType = "Schedule"
            });

            return true;
        }

        public async Task<bool> DeleteScheduleAsync(int id)
        {
            var schedule = await _context.Schedules
                .Include(s => s.Sessions)
                    .ThenInclude(session => session.Attendances) // Load Attendances
                .Include(s => s.Class)
                .FirstOrDefaultAsync(s => s.ScheduleId == id);
                
            if (schedule == null)
                return false;

            // ✅ FIX: Xóa Attendance trước, sau đó xóa ClassSession, cuối cùng xóa Schedule
            if (schedule.Sessions != null && schedule.Sessions.Any())
            {
                foreach (var session in schedule.Sessions)
                {
                    if (session.Attendances != null && session.Attendances.Any())
                    {
                        _context.Attendances.RemoveRange(session.Attendances);
                    }
                }
                _context.ClassSessions.RemoveRange(schedule.Sessions);
            }

            _context.Schedules.Remove(schedule);
            await _context.SaveChangesAsync();

            var className = schedule.Class?.ClassName ?? "";
            await _notificationService.SendToClassTeachersAsync(schedule.ClassId, new CreateRoleNotificationRequest
            {
                TenantId = _context.CurrentTenantId,
                Title = "Lịch học đã bị xóa",
                Message = $"Lịch học của lớp {className} đã bị xóa.",
                Type = "Warning",
                Category = "Schedule",
                ReferenceId = id.ToString(),
                ReferenceType = "Schedule"
            });

            await _notificationService.SendToClassStudentsAsync(schedule.ClassId, new CreateRoleNotificationRequest
            {
                TenantId = _context.CurrentTenantId,
                Title = "Lịch học đã bị xóa",
                Message = $"Lịch học của lớp {className} đã bị xóa.",
                Type = "Warning",
                Category = "Schedule",
                ReferenceId = id.ToString(),
                ReferenceType = "Schedule"
            });

            await _notificationService.SendToClassParentsAsync(schedule.ClassId, new CreateRoleNotificationRequest
            {
                TenantId = _context.CurrentTenantId,
                Title = "Lịch học đã bị xóa",
                Message = $"Lịch học của lớp {className} đã bị xóa.",
                Type = "Warning",
                Category = "Schedule",
                ReferenceId = id.ToString(),
                ReferenceType = "Schedule"
            });

            return true;
        }

        /// <summary>
        /// Get schedule for a specific teacher
        /// </summary>
        public async Task<IEnumerable<TeacherScheduleDto>> GetTeacherScheduleAsync(int userId)
        {
            // First, find the Teacher by UserId
            var teacher = await _context.Teachers
                .FirstOrDefaultAsync(t => t.UserId == userId);
            
            if (teacher == null)
                return Enumerable.Empty<TeacherScheduleDto>();

            var schedules = await _context.Schedules
                .Include(s => s.Room)
                .Include(s => s.Sessions)
                .Include(s => s.Class)
                    .ThenInclude(c => c.Subject)
                .Include(s => s.Class)
                    .ThenInclude(c => c.Room)
                .Where(s => s.Class.TeacherId == teacher.UserId && s.Class.Status == "Active")
                .ToListAsync();

            return schedules
                .Where(s => s.Sessions.Count != 1) // Filter out one-off schedules
                .Select(s => new TeacherScheduleDto
            {
                ScheduleId = s.ScheduleId,
                SessionId = null,
                SessionDate = null,
                SessionStatus = null,
                ClassId = s.ClassId,
                ClassName = s.Class?.ClassName ?? "",
                SubjectId = s.Class?.SubjectId ?? 0,
                SubjectName = s.Class?.Subject?.SubjectName ?? "",
                TeacherName = s.Class?.Teacher?.TeacherNavigation?.FullName,
                DayOfWeek = s.DayOfWeek,
                DayName = GetDayName(s.DayOfWeek),
                StartTime = s.StartTime.ToTimeSpan(),
                EndTime = s.EndTime.ToTimeSpan(),
                RoomId = s.RoomId ?? s.Class?.RoomId,
                RoomName = s.Room?.RoomName ?? s.Class?.Room?.RoomName,
                StartDate = s.Class?.StartDate,
                EndDate = s.Class?.EndDate,
                Status = s.Class?.Status ?? "",
                Description = s.Class?.Description
            });
        }

        public async Task<IEnumerable<TeacherScheduleDto>> GetAllSessionSchedulesAsync()
        {
            var sessions = await _context.ClassSessions
                .Include(cs => cs.Schedule)
                    .ThenInclude(sc => sc.Room)
                .Include(cs => cs.Class)
                    .ThenInclude(c => c.Subject)
                .Include(cs => cs.Class)
                    .ThenInclude(c => c.Teacher)
                        .ThenInclude(t => t!.TeacherNavigation)
                .Include(cs => cs.Class)
                    .ThenInclude(c => c.Room)
                .Where(cs =>
                    cs.Class != null &&
                    cs.Class.Status == "Active")
                .OrderBy(cs => cs.SessionDate)
                .ThenBy(cs => cs.Schedule!.StartTime)
                .ToListAsync();

            return sessions.Select(cs => new TeacherScheduleDto
            {
                ScheduleId = cs.ScheduleId,
                SessionId = cs.SessionId,
                SessionDate = cs.SessionDate,
                SessionStatus = cs.Status,
                ClassId = cs.ClassId ?? 0,
                ClassName = cs.Class?.ClassName ?? "",
                SubjectId = cs.Class?.SubjectId ?? 0,
                SubjectName = cs.Class?.Subject?.SubjectName ?? "",
                TeacherName = cs.Class?.Teacher?.TeacherNavigation?.FullName,
                DayOfWeek = cs.Schedule != null ? cs.Schedule.DayOfWeek : (int)cs.SessionDate.DayOfWeek,
                DayName = GetDayName(cs.Schedule != null ? cs.Schedule.DayOfWeek : (int)cs.SessionDate.DayOfWeek),
                StartTime = (cs.Schedule != null ? cs.Schedule.StartTime : TimeOnly.MinValue).ToTimeSpan(),
                EndTime = (cs.Schedule != null ? cs.Schedule.EndTime : TimeOnly.MinValue).ToTimeSpan(),
                RoomId = cs.Schedule?.RoomId ?? cs.Class?.RoomId,
                RoomName = cs.Schedule?.Room?.RoomName ?? cs.Class?.Room?.RoomName,
                StartDate = cs.Class?.StartDate,
                EndDate = cs.Class?.EndDate,
                Status = cs.Class?.Status ?? "",
                Description = cs.Class?.Description
            });
        }

        public async Task<IEnumerable<TeacherScheduleDto>> GetTeacherSessionScheduleAsync(int userId)
        {
            var teacher = await _context.Teachers
                .FirstOrDefaultAsync(t => t.UserId == userId);

            if (teacher == null)
                return Enumerable.Empty<TeacherScheduleDto>();

            var sessions = await _context.ClassSessions
                .Include(cs => cs.Schedule)
                    .ThenInclude(sc => sc.Room)
                .Include(cs => cs.Class)
                    .ThenInclude(c => c.Subject)
                .Include(cs => cs.Class)
                    .ThenInclude(c => c.Teacher)
                        .ThenInclude(t => t!.TeacherNavigation)
                .Include(cs => cs.Class)
                    .ThenInclude(c => c.Room)
                .Where(cs =>
                    cs.Class != null &&
                    cs.Class.TeacherId == teacher.UserId &&
                    cs.Class.Status == "Active")
                .OrderBy(cs => cs.SessionDate)
                .ThenBy(cs => cs.Schedule!.StartTime)
                .ToListAsync();

            return sessions.Select(cs => new TeacherScheduleDto
            {
                ScheduleId = cs.ScheduleId,
                SessionId = cs.SessionId,
                SessionDate = cs.SessionDate,
                SessionStatus = cs.Status,
                ClassId = cs.ClassId ?? 0,
                ClassName = cs.Class?.ClassName ?? "",
                SubjectId = cs.Class?.SubjectId ?? 0,
                SubjectName = cs.Class?.Subject?.SubjectName ?? "",
                TeacherName = cs.Class?.Teacher?.TeacherNavigation?.FullName,
                DayOfWeek = cs.Schedule != null ? cs.Schedule.DayOfWeek : (int)cs.SessionDate.DayOfWeek,
                DayName = GetDayName(cs.Schedule != null ? cs.Schedule.DayOfWeek : (int)cs.SessionDate.DayOfWeek),
                StartTime = (cs.Schedule != null ? cs.Schedule.StartTime : TimeOnly.MinValue).ToTimeSpan(),
                EndTime = (cs.Schedule != null ? cs.Schedule.EndTime : TimeOnly.MinValue).ToTimeSpan(),
                RoomId = cs.Schedule?.RoomId ?? cs.Class?.RoomId,
                RoomName = cs.Schedule?.Room?.RoomName ?? cs.Class?.Room?.RoomName,
                StartDate = cs.Class?.StartDate,
                EndDate = cs.Class?.EndDate,
                Status = cs.Class?.Status ?? "",
                Description = cs.Class?.Description
            });
        }

        /// <summary>
        /// Get schedule for a specific assistant
        /// </summary>
        public async Task<IEnumerable<TeacherScheduleDto>> GetAssistantScheduleAsync(int userId)
        {
            // First, find the Assistant by UserId
            var assistant = await _context.Assistants
                .FirstOrDefaultAsync(a => a.UserId == userId);
            
            if (assistant == null)
                return Enumerable.Empty<TeacherScheduleDto>();
    
            var schedules = await _context.Schedules
                .Include(s => s.Room)
                .Include(s => s.Sessions)
                .Include(s => s.Class)
                    .ThenInclude(c => c.Subject)
                .Include(s => s.Class)
                    .ThenInclude(c => c.Room)
                .Where(s => s.Class.AssistantId == assistant.UserId && s.Class.Status == "Active")
                .ToListAsync();
    
            return schedules
                .Where(s => s.Sessions.Count != 1) // Filter out one-off schedules
                .Select(s => new TeacherScheduleDto
            {
                ScheduleId = s.ScheduleId,
                SessionId = null,
                SessionDate = null,
                SessionStatus = null,
                ClassId = s.ClassId,
                ClassName = s.Class?.ClassName ?? "",
                SubjectId = s.Class?.SubjectId ?? 0,
                SubjectName = s.Class?.Subject?.SubjectName ?? "",
                TeacherName = s.Class?.Teacher?.TeacherNavigation?.FullName,
                DayOfWeek = s.DayOfWeek,
                DayName = GetDayName(s.DayOfWeek),
                StartTime = s.StartTime.ToTimeSpan(),
                EndTime = s.EndTime.ToTimeSpan(),
                RoomId = s.RoomId ?? s.Class?.RoomId,
                RoomName = s.Room?.RoomName ?? s.Class?.Room?.RoomName,
                StartDate = s.Class?.StartDate,
                EndDate = s.Class?.EndDate,
                Status = s.Class?.Status ?? "",
                Description = s.Class?.Description
            });
        }

        /// <summary>
        /// Get schedule for a specific student
        /// </summary>
        public async Task<IEnumerable<StudentScheduleDto>> GetStudentScheduleAsync(int userId)
        {
            // First, find the Student by UserId
            var student = await _context.Students
                 .Include(s => s.Classes)
                    .ThenInclude(c => c.Schedules)
                        .ThenInclude(sch => sch.Room)
                .Include(s => s.Classes)
                    .ThenInclude(c => c.Schedules)
                        .ThenInclude(sch => sch.Sessions)
                .Include(s => s.Classes)
                    .ThenInclude(c => c.Subject)
                .Include(s => s.Classes)
                    .ThenInclude(c => c.Teacher)
                        .ThenInclude(t => t.TeacherNavigation)
                .Include(s => s.Classes)
                    .ThenInclude(c => c.Room)
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (student == null)
                return Enumerable.Empty<StudentScheduleDto>();

            var schedules = new List<StudentScheduleDto>();
            
            foreach (var classEntity in student.Classes.Where(c => c.Status == "Active"))
            {
                foreach (var schedule in classEntity.Schedules.Where(s => s.Sessions.Count != 1)) // Filter out one-off schedules
                {
                    schedules.Add(new StudentScheduleDto
                    {
                        ScheduleId = schedule.ScheduleId,
                        SessionId = null,
                        SessionDate = null,
                        SessionStatus = null,
                        ClassId = classEntity.ClassId,
                        ClassName = classEntity.ClassName ?? "",
                        SubjectId = classEntity.SubjectId,
                        SubjectName = classEntity.Subject?.SubjectName ?? "",
                        TeacherId = classEntity.TeacherId,
                        TeacherName = classEntity.Teacher?.TeacherNavigation?.FullName,
                        DayOfWeek = schedule.DayOfWeek,
                        DayName = GetDayName(schedule.DayOfWeek),
                        StartTime = schedule.StartTime.ToTimeSpan(),
                        EndTime = schedule.EndTime.ToTimeSpan(),
                        RoomId = schedule.RoomId ?? classEntity.RoomId,
                        RoomName = schedule.Room?.RoomName ?? classEntity.Room?.RoomName,
                        StartDate = classEntity.StartDate,
                        EndDate = classEntity.EndDate,
                        Status = classEntity.Status ?? "",
                        Description = classEntity.Description
                    });
                }
            }

            var classIds = student.Classes
                .Where(c => c.Status == "Active")
                .Select(c => c.ClassId)
                .ToList();

            if (classIds.Any())
            {
                var sessions = await _context.ClassSessions
                    .Include(cs => cs.Schedule)
                        .ThenInclude(sc => sc.Room)
                    .Include(cs => cs.Class)
                        .ThenInclude(c => c.Subject)
                    .Include(cs => cs.Class)
                        .ThenInclude(c => c.Teacher)
                            .ThenInclude(t => t!.TeacherNavigation)
                    .Include(cs => cs.Class)
                        .ThenInclude(c => c.Room)
                    .Where(cs => cs.ClassId.HasValue && classIds.Contains(cs.ClassId.Value))
                    .ToListAsync();

                foreach (var cs in sessions)
                {
                    schedules.Add(new StudentScheduleDto
                    {
                        ScheduleId = cs.ScheduleId,
                        SessionId = cs.SessionId,
                        SessionDate = cs.SessionDate,
                        SessionStatus = cs.Status,
                        ClassId = cs.ClassId ?? 0,
                        ClassName = cs.Class?.ClassName ?? "",
                        SubjectId = cs.Class?.SubjectId ?? 0,
                        SubjectName = cs.Class?.Subject?.SubjectName ?? "",
                        TeacherId = cs.Class?.TeacherId,
                        TeacherName = cs.Class?.Teacher?.TeacherNavigation?.FullName,
                        DayOfWeek = cs.Schedule?.DayOfWeek ?? (int)cs.SessionDate.DayOfWeek,
                        DayName = GetDayName(cs.Schedule?.DayOfWeek ?? (int)cs.SessionDate.DayOfWeek),
                        StartTime = (cs.Schedule != null ? cs.Schedule.StartTime : TimeOnly.MinValue).ToTimeSpan(),
                        EndTime = (cs.Schedule != null ? cs.Schedule.EndTime : TimeOnly.MinValue).ToTimeSpan(),
                        RoomId = cs.Schedule?.RoomId ?? cs.Class?.RoomId,
                        RoomName = cs.Schedule?.Room?.RoomName ?? cs.Class?.Room?.RoomName,
                        StartDate = cs.Class?.StartDate,
                        EndDate = cs.Class?.EndDate,
                        Status = cs.Class?.Status ?? "",
                        Description = cs.Class?.Description
                    });
                }
            }

            return schedules.OrderBy(s => s.DayOfWeek).ThenBy(s => s.StartTime);
        }

        private static string GetDayName(int dayOfWeek)
        {
            return dayOfWeek switch
            {
                0 => "Chủ Nhật",
                1 => "Thứ Hai",
                2 => "Thứ Ba",
                3 => "Thứ Tư",
                4 => "Thứ Năm",
                5 => "Thứ Sáu",
                6 => "Thứ Bảy",
                _ => ""
            };
        }
    }
}