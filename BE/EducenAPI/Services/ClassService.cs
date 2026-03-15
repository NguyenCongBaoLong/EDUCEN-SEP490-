using EducenAPI.DTOs.Classes;
using EducenAPI.DTOs.Students;
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
            return await _context.Classes
                .Include(c => c.Subject)
                .Include(c => c.Teacher)
                    .ThenInclude(t => t!.TeacherNavigation)
                .Include(c => c.Assistant)
                    .ThenInclude(a => a!.AssistantNavigation)
                .Include(c => c.Students)
                .Include(c => c.Schedules)
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
                    StartDate = c.StartDate,
                    EndDate = c.EndDate,
                    Status = c.Status,
                    StudentCount = c.Students.Count,
                    CreatedAt = DateTime.Now,
                    ScheduleSlots = c.Schedules.Select(s => new CreateScheduleSlotDto
                    {
                        DayOfWeek = s.DayOfWeek,
                        StartTime = s.StartTime.ToString("HH:mm"),
                        EndTime = s.EndTime.ToString("HH:mm")
                    }).ToList()
                })
                .ToListAsync();
        }

        public async Task<ClassDto?> GetClassByIdAsync(int id)
        {
            return await _context.Classes
                .Include(c => c.Subject)
                .Include(c => c.Teacher)
                    .ThenInclude(t => t!.TeacherNavigation)
                .Include(c => c.Assistant)
                    .ThenInclude(a => a!.AssistantNavigation)
                .Include(c => c.Schedules)
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
                    StartDate = c.StartDate,
                    EndDate = c.EndDate,
                    Status = c.Status,
                    StudentCount = c.Students.Count,
                    CreatedAt = DateTime.Now,
                    ScheduleSlots = c.Schedules.Select(s => new CreateScheduleSlotDto
                    {
                        DayOfWeek = s.DayOfWeek,
                        StartTime = s.StartTime.ToString("HH:mm"),
                        EndTime = s.EndTime.ToString("HH:mm")
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
            }

            // Validate Assistant exists (if provided)
            if (dto.AssistantId.HasValue)
            {
                var assistant = await _context.Assistants.FindAsync(dto.AssistantId.Value);
                if (assistant == null)
                    throw new Exception("Assistant not found");
            }

            // Validate date range
            if (dto.StartDate.HasValue && dto.EndDate.HasValue)
            {
                if (dto.StartDate > dto.EndDate)
                    throw new Exception("StartDate cannot be greater than EndDate");
                
                if (dto.StartDate < DateTime.Today)
                    throw new Exception("StartDate cannot be in the past");
            }

            // Validate and create schedules
            if (dto.ScheduleSlots != null && dto.ScheduleSlots.Any())
            {
                await ValidateScheduleSlots(dto.ScheduleSlots);
            }

            var newClass = new Class
            {
                ClassName = dto.ClassName,
                Description = dto.Description,
                SyllabusContent = dto.SyllabusContent,
                SubjectId = dto.SubjectId,
                TeacherId = dto.TeacherId,
                AssistantId = dto.AssistantId,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Status = dto.Status ?? "Active"
            };

            _context.Classes.Add(newClass);
            await _context.SaveChangesAsync();

            // Create schedules for this class
            if (dto.ScheduleSlots != null && dto.ScheduleSlots.Any())
            {
                await CreateSchedulesForClass(newClass.ClassId, dto.ScheduleSlots);
            }

            return await GetClassByIdAsync(newClass.ClassId) ?? throw new Exception("Failed to retrieve created class");
        }

        private async Task ValidateScheduleSlots(List<CreateScheduleSlotDto> scheduleSlots)
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

        private async Task CreateSchedulesForClass(int classId, List<CreateScheduleSlotDto> scheduleSlots)
        {
            foreach (var slot in scheduleSlots)
            {
                var schedule = new Schedule
                {
                    ClassId = classId,
                    DayOfWeek = slot.DayOfWeek,
                    StartTime = TimeOnly.Parse(slot.StartTime),
                    EndTime = TimeOnly.Parse(slot.EndTime)
                };
                _context.Schedules.Add(schedule);
            }
            await _context.SaveChangesAsync();
        }

        public async Task<bool> UpdateClassAsync(int id, UpdateClassDto dto)
        {
            var existingClass = await _context.Classes.FindAsync(id);
            if (existingClass == null)
                return false;

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
                existingClass.TeacherId = dto.TeacherId;
            }
            else if (dto.TeacherId == null) 
            {
                // Note: Consider if business logic allows unassigning
                existingClass.TeacherId = null;
            }

            if (dto.AssistantId.HasValue)
            {
                var assistant = await _context.Assistants.FindAsync(dto.AssistantId.Value);
                if (assistant == null)
                    throw new Exception("Assistant not found");
                existingClass.AssistantId = dto.AssistantId;
            }
            else if (dto.AssistantId == null)
            {
                existingClass.AssistantId = null;
            }

            if (dto.StartDate.HasValue)
                existingClass.StartDate = dto.StartDate;

            if (dto.EndDate.HasValue)
                existingClass.EndDate = dto.EndDate;

            if (dto.Status != null)
                existingClass.Status = dto.Status;

            // Update schedules if provided
            if (dto.ScheduleSlots != null)
            {
                // Remove existing schedules
                var oldSchedules = await _context.Schedules
                    .Where(s => s.ClassId == id)
                    .ToListAsync();
                _context.Schedules.RemoveRange(oldSchedules);

                // Add new schedules
                foreach (var slot in dto.ScheduleSlots)
                {
                    // More robust time parsing
                    if (!TimeOnly.TryParse(slot.StartTime, out var startTime))
                        throw new Exception($"Invalid start time format: {slot.StartTime}. Expected HH:mm or HH:mm:ss");
                    
                    if (!TimeOnly.TryParse(slot.EndTime, out var endTime))
                        throw new Exception($"Invalid end time format: {slot.EndTime}. Expected HH:mm or HH:mm:ss");

                    var schedule = new Schedule
                    {
                        ClassId = id,
                        DayOfWeek = slot.DayOfWeek,
                        StartTime = startTime,
                        EndTime = endTime
                    };
                    _context.Schedules.Add(schedule);
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteClassAsync(int id)
        {
            var existingClass = await _context.Classes
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.ClassId == id);

            if (existingClass == null)
                return false;

            if (existingClass.Students.Any())
                throw new Exception("Cannot delete class: class has students enrolled");

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
            var classEntity = await _context.Classes
                .Include(c => c.Students)
                    .ThenInclude(s => s.StudentNavigation)
                .FirstOrDefaultAsync(c => c.ClassId == classId);

            if (classEntity == null)
                return Enumerable.Empty<StudentDto>();

            return classEntity.Students.Select(s => new StudentDto
            {
                UserId = s.UserId,
                Username = s.StudentNavigation.Username ?? "",
                FullName = s.StudentNavigation.FullName ?? "",
                Email = s.Email ?? "",
                PhoneNumber = s.StudentNavigation.PhoneNumber,
                Grade = s.Grade,
                EnrollmentStatus = s.EnrollmentStatus ?? "",
                AccountStatus = s.StudentNavigation.AccountStatus ?? "",
                CreatedAt = DateTime.Now
            });
        }
    }
}
