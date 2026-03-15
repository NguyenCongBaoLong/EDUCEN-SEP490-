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

        public ScheduleService(EducenV2Context context)
        {
            _context = context;
        }

        public async Task<IEnumerable<ScheduleDto>> GetAllSchedulesAsync()
        {
            return await _context.Schedules
                .Include(s => s.Class)
                    .ThenInclude(c => c.Teacher)
                        .ThenInclude(t => t!.TeacherNavigation)
                .Include(s => s.Class)
                    .ThenInclude(c => c.Subject)
                .Select(s => new ScheduleDto
                {
                    ScheduleId = s.ScheduleId,
                    ClassId = s.ClassId,
                    ClassName = s.Class.ClassName ?? "",
                    SubjectId = s.Class.SubjectId,
                    SubjectName = s.Class.Subject.SubjectName,
                    DayOfWeek = s.DayOfWeek,
                    ScheduleDate = DateTime.Now.AddDays(s.DayOfWeek - (int)DateTime.Now.DayOfWeek),
                    StartTime = s.StartTime.ToTimeSpan(),
                    EndTime = s.EndTime.ToTimeSpan(),
                    StartDate = s.Class.StartDate,
                    EndDate = s.Class.EndDate,
                    TeacherName = s.Class.Teacher != null ? s.Class.Teacher.TeacherNavigation.FullName : null,
                    Notes = null,
                    Status = "Active",
                    CreatedAt = DateTime.Now
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<ScheduleDto>> GetSchedulesByClassIdAsync(int classId)
        {
            return await _context.Schedules
                .Include(s => s.Class)
                    .ThenInclude(c => c.Subject)
                .Where(s => s.ClassId == classId)
                .Select(s => new ScheduleDto
                {
                    ScheduleId = s.ScheduleId,
                    ClassId = s.ClassId,
                    ClassName = s.Class.ClassName ?? "",
                    SubjectId = s.Class.SubjectId,
                    SubjectName = s.Class.Subject.SubjectName,
                    DayOfWeek = s.DayOfWeek,
                    ScheduleDate = DateTime.Now.AddDays(s.DayOfWeek - (int)DateTime.Now.DayOfWeek),
                    StartTime = s.StartTime.ToTimeSpan(),
                    EndTime = s.EndTime.ToTimeSpan(),
                    StartDate = s.Class.StartDate,
                    EndDate = s.Class.EndDate,
                    Notes = null,
                    Status = "Active",
                    CreatedAt = DateTime.Now
                })
                .ToListAsync();
        }

        public async Task<ScheduleDto?> GetScheduleByIdAsync(int id)
        {
            return await _context.Schedules
                .Include(s => s.Class)
                    .ThenInclude(c => c.Subject)
                .Where(s => s.ScheduleId == id)
                .Select(s => new ScheduleDto
                {
                    ScheduleId = s.ScheduleId,
                    ClassId = s.ClassId,
                    ClassName = s.Class.ClassName ?? "",
                    SubjectId = s.Class.SubjectId,
                    SubjectName = s.Class.Subject.SubjectName,
                    DayOfWeek = s.DayOfWeek,
                    ScheduleDate = DateTime.Now.AddDays(s.DayOfWeek - (int)DateTime.Now.DayOfWeek),
                    StartTime = s.StartTime.ToTimeSpan(),
                    EndTime = s.EndTime.ToTimeSpan(),
                    StartDate = s.Class.StartDate,
                    EndDate = s.Class.EndDate,
                    Notes = null,
                    Status = "Active",
                    CreatedAt = DateTime.Now
                })
                .FirstOrDefaultAsync();
        }

        public async Task<ScheduleDto> CreateScheduleAsync(CreateScheduleDto dto)
        {
            // Validate class exists
            var classExists = await _context.Classes.FindAsync(dto.ClassId);
            if (classExists == null)
                throw new Exception("Class does not exist");

            // Validate class is active
            if (classExists.Status != "Active")
                throw new Exception("Class is inactive");

            // Validate schedule date is not in the past
            if (dto.ScheduleDate.Date < DateTime.Today)
                throw new Exception("Schedule cannot be in the past");

            // Validate start time is not in the past for today
            if (dto.ScheduleDate.Date == DateTime.Today && dto.StartTime < DateTime.Now.TimeOfDay)
                throw new Exception("Schedule cannot start in the past");

            // Validate time order
            if (dto.StartTime >= dto.EndTime)
                throw new Exception("EndTime must be greater than StartTime");

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
                    throw new Exception("Schedule time overlaps with existing schedule");
            }

            var schedule = new Schedule
            {
                ClassId = dto.ClassId,
                DayOfWeek = dayOfWeek,
                StartTime = TimeOnly.FromTimeSpan(dto.StartTime),
                EndTime = TimeOnly.FromTimeSpan(dto.EndTime)
            };

            _context.Schedules.Add(schedule);
            await _context.SaveChangesAsync();

            return await GetScheduleByIdAsync(schedule.ScheduleId) ?? throw new Exception("Failed to retrieve created schedule");
        }

        public async Task<bool> UpdateScheduleAsync(int id, UpdateScheduleDto dto)
        {
            var schedule = await _context.Schedules.FindAsync(id);
            if (schedule == null)
                return false;

            if (dto.ScheduleDate.HasValue)
                schedule.DayOfWeek = (int)dto.ScheduleDate.Value.DayOfWeek;

            if (dto.StartTime.HasValue)
                schedule.StartTime = TimeOnly.FromTimeSpan(dto.StartTime.Value);

            if (dto.EndTime.HasValue)
                schedule.EndTime = TimeOnly.FromTimeSpan(dto.EndTime.Value);

            if (schedule.StartTime >= schedule.EndTime)
                throw new Exception("Start time must be before end time");

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteScheduleAsync(int id)
        {
            var schedule = await _context.Schedules.FindAsync(id);
            if (schedule == null)
                return false;

            _context.Schedules.Remove(schedule);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ApproveScheduleAsync(int id)
        {
            var schedule = await _context.Schedules.FindAsync(id);
            if (schedule == null)
                return false;
            return true;
        }

        public async Task<bool> RejectScheduleAsync(int id, string? reason)
        {
            var schedule = await _context.Schedules.FindAsync(id);
            if (schedule == null)
                return false;
            return true;
        }
    }
}
