using EducenAPI.DTOs.Classes;
using EducenAPI.DTOs.Students;
using EducenAPI.DTOs.Assignments;
using EducenAPI.DTOs.LessionMaterials;
using EducenAPI.DTOs.Submissions;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

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

        public ClassService(EducenV2Context context)
        {
            _context = context;
        }

        public async Task<IEnumerable<ClassDto>> GetAllClassesAsync()
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
                    CreatedAt = DateTime.Now,
                    ScheduleSlots = c.Schedules.Select(s => new CreateScheduleSlotDto
                    {
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

            return await _context.Classes
                .Include(c => c.Subject)
                .Include(c => c.Teacher)
                    .ThenInclude(t => t!.TeacherNavigation)
                .Include(c => c.Assistant)
                    .ThenInclude(a => a!.AssistantNavigation)
                .Include(c => c.Room)
                .Include(c => c.Grade)
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
                    CreatedAt = DateTime.Now,
                    ScheduleSlots = c.Schedules.Select(s => new CreateScheduleSlotDto
                    {
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
            // Validate Subject exists
            var subject = await _context.Subjects.FindAsync(dto.SubjectId);
            if (subject == null)
                throw new Exception("Subject not found");

            // Validate Teacher exists (if provided)
            if (dto.TeacherId.HasValue)
            {
                var teacher = await _context.Teachers.FindAsync(dto.TeacherId.Value);
                if (teacher == null)
                    throw new Exception("Teacher not found");
                
                // Check if teacher is already assigned to another active class at this time
                if (dto.ScheduleSlots != null && dto.ScheduleSlots.Any())
                {
                    await ValidateTeacherAvailability(dto.TeacherId.Value, dto.ScheduleSlots, dto.StartDate, dto.EndDate);
                }
            }

            // Validate Assistant exists (if provided)
            if (dto.AssistantId.HasValue)
            {
                var assistant = await _context.Assistants.FindAsync(dto.AssistantId.Value);
                if (assistant == null)
                    throw new Exception("Assistant not found");
                
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
                    }
                }
            }
            else if (dto.RoomId.HasValue)
            {
                var room = await _context.Rooms.FindAsync(dto.RoomId.Value);
                if (room == null) throw new Exception("Room not found");
            }

            // Validate date range
            if (dto.StartDate.HasValue && dto.EndDate.HasValue)
            {
                if (dto.StartDate > dto.EndDate)
                    throw new Exception("StartDate cannot be greater than EndDate");
                
                if (dto.StartDate < DateTime.Today)
                    throw new Exception("StartDate cannot be in the past");
            }

            // Validate ClassStatus
            var validStatuses = new[] { "Active", "Inactive", "Completed", "Cancelled" };
            if (dto.Status != null && !validStatuses.Contains(dto.Status))
                throw new Exception($"Status must be one of: {string.Join(", ", validStatuses)}");

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
                AssistantId = dto.AssistantId,
                RoomId = dto.RoomId,
                GradeId = dto.GradeId,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Status = dto.Status ?? "Active"
            };

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
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }

            return await GetClassByIdAsync(newClass.ClassId) ?? throw new Exception("Failed to retrieve created class");
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
                            throw new Exception($"Teacher is already assigned to class '{existingClass.ClassName}' at this time");
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
                            throw new Exception($"Assistant is already assigned to class '{existingClass.ClassName}' at this time");
                        }
                    }
                }
            }
        }

        private async Task ValidateRoomAvailability(int roomId, int dayOfWeek, string startTimeStr, string endTimeStr, DateTime? startDate, DateTime? endDate, int? excludeClassId = null)
        {
            var startTime = TimeOnly.Parse(startTimeStr);
            var endTime = TimeOnly.Parse(endTimeStr);

            // Check against ALL schedules in this room for active classes
            var conflictingSchedules = await _context.Schedules
                .Include(s => s.Class)
                .Where(s => s.RoomId == roomId && s.Class.Status == "Active" && (excludeClassId == null || s.ClassId != excludeClassId))
                .Where(s => s.DayOfWeek == dayOfWeek)
                .ToListAsync();

            foreach (var existingSlot in conflictingSchedules)
            {
                // Check date overlap
                if (startDate.HasValue && endDate.HasValue && existingSlot.Class.StartDate.HasValue && existingSlot.Class.EndDate.HasValue)
                {
                    if (startDate > existingSlot.Class.EndDate || endDate < existingSlot.Class.StartDate)
                        continue;
                }

                // Check time overlap
                if (startTime < existingSlot.EndTime && endTime > existingSlot.StartTime)
                {
                    throw new Exception($"Room is already occupied by class '{existingSlot.Class.ClassName}' at this time (Day {dayOfWeek}: {existingSlot.StartTime}-{existingSlot.EndTime})");
                }
            }
        }

        private void ValidateScheduleSlots(List<CreateScheduleSlotDto> scheduleSlots)
        {
            foreach (var slot in scheduleSlots)
            {
                // Validate DayOfWeek range
                if (slot.DayOfWeek < 0 || slot.DayOfWeek > 6)
                    throw new Exception("DayOfWeek must be between 0 and 6");

                // Validate time format
                if (!TimeOnly.TryParse(slot.StartTime, out var startTime))
                    throw new Exception($"Invalid start time format: {slot.StartTime}");
                
                if (!TimeOnly.TryParse(slot.EndTime, out var endTime))
                    throw new Exception($"Invalid end time format: {slot.EndTime}");

                // Validate time order
                if (startTime >= endTime)
                    throw new Exception("EndTime must be greater than StartTime");

                // Validate time doesn't cross midnight
                if (startTime > endTime)
                    throw new Exception("Schedule cannot cross midnight");
            }

            // Check for duplicate slots
            var duplicateSlots = scheduleSlots
                .GroupBy(s => new { s.DayOfWeek, s.StartTime, s.EndTime })
                .Where(g => g.Count() > 1)
                .ToList();

            if (duplicateSlots.Any())
                throw new Exception("Duplicate schedule slots found");

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
                            throw new Exception("Schedule time overlaps with another schedule on the same day");
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
                    
                    foreach (var sessionDate in sessionDates)
                    {
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
            for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
            {
                var dayOfWeek = (int)date.DayOfWeek;
                var matchingSchedule = schedules.FirstOrDefault(s => s.DayOfWeek == dayOfWeek);
                if (matchingSchedule != null)
                {
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
                .FirstOrDefaultAsync(c => c.ClassId == id);
                
            if (existingClass == null)
                return false;

            // Use transaction for updating class and schedules
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                if (dto.ClassName != null)
                    existingClass.ClassName = dto.ClassName;

                if (dto.Description != null)
                    existingClass.Description = dto.Description;

                if (dto.SyllabusContent != null)
                    existingClass.SyllabusContent = dto.SyllabusContent;

                if (dto.SubjectId.HasValue)
                {
                    var subject = await _context.Subjects.FindAsync(dto.SubjectId.Value);
                    if (subject == null)
                        throw new Exception("Subject not found");
                    existingClass.SubjectId = dto.SubjectId.Value;
                }

                if (dto.TeacherId.HasValue)
                {
                    var teacher = await _context.Teachers.FindAsync(dto.TeacherId.Value);
                    if (teacher == null)
                        throw new Exception("Teacher not found");
                    
                    // Validate teacher availability if changing teacher or updating schedules
                    if (existingClass.TeacherId != dto.TeacherId.Value || dto.ScheduleSlots != null)
                    {
                        var scheduleSlots = dto.ScheduleSlots ?? existingClass.Schedules.Select(s => new CreateScheduleSlotDto
                        {
                            DayOfWeek = s.DayOfWeek,
                            StartTime = s.StartTime.ToString("HH:mm"),
                            EndTime = s.EndTime.ToString("HH:mm")
                        }).ToList();
                        
                        await ValidateTeacherAvailability(dto.TeacherId.Value, scheduleSlots, dto.StartDate ?? existingClass.StartDate, dto.EndDate ?? existingClass.EndDate, id);
                    }
                    existingClass.TeacherId = dto.TeacherId;
                }
                else if (dto.TeacherId == null) 
                {
                    existingClass.TeacherId = null;
                }

                if (dto.AssistantId.HasValue)
                {
                    var assistant = await _context.Assistants.FindAsync(dto.AssistantId.Value);
                    if (assistant == null)
                        throw new Exception("Assistant not found");
                    
                    // Validate assistant availability if changing assistant or updating schedules
                    if (existingClass.AssistantId != dto.AssistantId.Value || dto.ScheduleSlots != null)
                    {
                        var scheduleSlots = dto.ScheduleSlots ?? existingClass.Schedules.Select(s => new CreateScheduleSlotDto
                        {
                            DayOfWeek = s.DayOfWeek,
                            StartTime = s.StartTime.ToString("HH:mm"),
                            EndTime = s.EndTime.ToString("HH:mm")
                        }).ToList();
                        
                        await ValidateAssistantAvailability(dto.AssistantId.Value, scheduleSlots, dto.StartDate ?? existingClass.StartDate, dto.EndDate ?? existingClass.EndDate, id);
                    }
                    existingClass.AssistantId = dto.AssistantId;
                }
                else if (dto.AssistantId == null)
                {
                    existingClass.AssistantId = null;
                }

                if (dto.RoomId.HasValue || dto.ScheduleSlots != null)
                {
                    var roomIdToValidate = dto.RoomId ?? existingClass.RoomId;
                    var slotsToValidate = dto.ScheduleSlots ?? existingClass.Schedules.Select(s => new CreateScheduleSlotDto
                    {
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
                        }
                    }
                    
                    if (dto.RoomId.HasValue)
                        existingClass.RoomId = dto.RoomId.Value;
                }
                else if (dto.RoomId == null && dto.ScheduleSlots == null)
                {
                    existingClass.RoomId = null;
                }

                if (dto.GradeId.HasValue)
                {
                    var grade = await _context.Grades.FindAsync(dto.GradeId.Value);
                    if (grade == null)
                        throw new Exception("Grade not found");
                    existingClass.GradeId = dto.GradeId.Value;
                }
                else if (dto.GradeId == null)
                {
                    existingClass.GradeId = null;
                }

                if (dto.StartDate.HasValue)
                    existingClass.StartDate = dto.StartDate;

                if (dto.EndDate.HasValue)
                    existingClass.EndDate = dto.EndDate;

                if (dto.Status != null)
                {
                    var validStatuses = new[] { "Active", "Inactive", "Completed", "Cancelled" };
                    if (!validStatuses.Contains(dto.Status))
                        throw new Exception($"Status must be one of: {string.Join(", ", validStatuses)}");
                    existingClass.Status = dto.Status;
                }

                // Update schedules if provided
                if (dto.ScheduleSlots != null)
                {
                    // ✅ FIX: Xóa ClassSessions trước khi xóa Schedules để tránh lỗi Foreign Key Constraint
                    foreach (var schedule in existingClass.Schedules)
                    {
                        if (schedule.Sessions != null && schedule.Sessions.Any())
                        {
                            _context.ClassSessions.RemoveRange(schedule.Sessions);
                        }
                    }

                    // Remove existing schedules (cascades to sessions manually handled above)
                    _context.Schedules.RemoveRange(existingClass.Schedules);
                    await _context.SaveChangesAsync();

                    // Create new schedules and sessions
                    await CreateSchedulesForClass(id, dto.RoomId ?? existingClass.RoomId, dto.ScheduleSlots, dto.StartDate ?? existingClass.StartDate, dto.EndDate ?? existingClass.EndDate);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
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

            if (existingClass.Students.Any())
                throw new Exception("Cannot delete class: class has students enrolled");

            // ✅ FIX: Xóa ClassSessions trước khi xóa Schedules
            foreach (var schedule in existingClass.Schedules)
            {
                if (schedule.Sessions != null && schedule.Sessions.Any())
                {
                    _context.ClassSessions.RemoveRange(schedule.Sessions);
                }
            }

            // Xóa Schedules
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

            var teacher = await _context.Teachers.FindAsync(teacherId);
            if (teacher == null)
                throw new Exception("Teacher not found");

            existingClass.TeacherId = teacherId;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> AssignAssistantAsync(int classId, int assistantId)
        {
            var existingClass = await _context.Classes.FindAsync(classId);
            if (existingClass == null)
                return false;

            var assistant = await _context.Assistants.FindAsync(assistantId);
            if (assistant == null)
                throw new Exception("Assistant not found");

            existingClass.AssistantId = assistantId;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> AddStudentToClassAsync(int classId, int studentId)
        {
            var existingClass = await _context.Classes
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.ClassId == classId);

            if (existingClass == null)
                return false;

            var student = await _context.Students.FindAsync(studentId);
            if (student == null)
                throw new Exception("Student not found");

            if (existingClass.Students.Any(s => s.UserId == studentId))
                throw new Exception("Student already enrolled in this class");

            existingClass.Students.Add(student);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RemoveStudentFromClassAsync(int classId, int studentId)
        {
            var existingClass = await _context.Classes
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.ClassId == classId);

            if (existingClass == null)
                return false;

            var student = existingClass.Students.FirstOrDefault(s => s.UserId == studentId);
            if (student == null)
                throw new Exception("Student not enrolled in this class");

            existingClass.Students.Remove(student);
            await _context.SaveChangesAsync();
            return true;
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

            // Check if student already in class
            if (existingClass.Students.Any(s => s.UserId == student.UserId))
                return new ImportStudentToClassResult { Success = false, ErrorMessage = $"Học sinh '{studentDto.Username}' đã có trong lớp." };

            existingClass.Students.Add(student);
            await _context.SaveChangesAsync();

            return new ImportStudentToClassResult { Success = true };
        }

        public async Task<IEnumerable<StudentDto>> GetStudentsByClassIdAsync(int classId)
        {
            // Dùng projection rõ ràng để tránh SELECT cột FullName chưa có trong DB
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
                })
                .ToListAsync();

            return students.Select(s => new StudentDto
            {
                UserId = s.UserId,
                Username = s.UserUsername ?? "",
                FullName = s.UserFullName ?? "",
                Email = s.UserEmail ?? "",
                PhoneNumber = s.UserPhone,
                Grade = s.Grade,
                EnrollmentStatus = s.EnrollmentStatus ?? "",
                AccountStatus = s.UserStatus ?? "",
                CreatedAt = DateTime.Now
            }).ToList();
        }

        public async Task<IEnumerable<SessionResponseDto>> GetSessionsByClassIdAsync(int classId)
        {
            var sessions = await _context.ClassSessions
                .Include(s => s.Schedule)
                .Where(s => s.ClassId == classId || (s.Schedule != null && s.Schedule.ClassId == classId))
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
                Title = $"Buổi {sessions.IndexOf(s) + 1}: Ngày {s.SessionDate:dd/MM/yyyy}"
            }).ToList();
        }

        public async Task<StudentClassDetailDto?> GetStudentClassDetailAsync(int studentId, int classId, string baseUrl)
        {
            var classInfo = await GetClassByIdAsync(classId);
            if (classInfo == null) return null;

            var sessions = await _context.ClassSessions
                .Include(s => s.Schedule)
                .Include(s => s.LessonMaterials)
                .Include(s => s.Assignments)
                    .ThenInclude(a => a.Submissions.Where(sub => sub.StudentId == studentId))
                .Where(s => s.ClassId == classId)
                .OrderBy(s => s.SessionDate)
                .ToListAsync();

            var dayLabels = new[] { "Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy" };

            var result = new StudentClassDetailDto
            {
                ClassInfo = classInfo,
                Sessions = sessions.Select((s, index) => new StudentSessionDto
                {
                    SessionId = s.SessionId,
                    ScheduleId = s.ScheduleId,
                    SessionDate = s.SessionDate,
                    Status = s.Status,
                    DayLabel = dayLabels[(int)s.SessionDate.DayOfWeek],
                    Time = s.Schedule != null ? $"{s.Schedule.StartTime:HH:mm} - {s.Schedule.EndTime:HH:mm}" : "N/A",
                    Title = $"Buổi {index + 1}: Ngày {s.SessionDate:dd/MM/yyyy}",
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
                        Title = a.Title,
                        Description = a.Description,
                        DueDate = a.EndTime,
                        FileUrl = !string.IsNullOrEmpty(a.FileUrl)
                            ? $"{baseUrl}/{a.FileUrl.Replace("\\", "/").Replace("wwwroot/", "")}"
                            : null,
                        CurrentSubmission = a.Submissions.Select(sub => new SubmissionResponseDto
                        {
                            SubId = sub.SubId,
                            AsmId = sub.AsmId,
                            StudentId = sub.StudentId,
                            FileUrl = !string.IsNullOrEmpty(sub.FileUrl)
                                ? $"{baseUrl}/{sub.FileUrl.Replace("\\", "/").Replace("wwwroot/", "")}"
                                : null,
                            SubmittedAt = sub.SubmittedAt,
                            Status = sub.Status,
                            Score = sub.Score,
                            TeacherComment = sub.TeacherComment,
                            GradedAt = sub.GradedAt,
                            IsPublished = sub.IsPublished
                        }).FirstOrDefault()
                    }).ToList()
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
                .Include(c => c.Teacher).ThenInclude(t => t.TeacherNavigation)
                .Include(c => c.Assistant).ThenInclude(a => a.AssistantNavigation)
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
                    TotalSessions = c.Sessions.Count,
                    CompletedSessions = c.Sessions.Count(s => s.Status == "Completed" || s.SessionDate < DateTime.Now),
                    Color = GetSubjectColor(c.Subject?.SubjectName)
                };
            }).ToList();
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
    }
}
