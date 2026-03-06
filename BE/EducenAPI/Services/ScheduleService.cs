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
                .Select(s => new ScheduleDto
                {
                    ScheduleId = s.ScheduleId,
                    ClassId = s.ClassId,
                    ClassName = s.Class.ClassName ?? "",
                    ScheduleDate = s.ScheduleDate,
                    StartTime = s.StartTime,
                    EndTime = s.EndTime,
                    Notes = s.Notes,
                    Status = s.Status ?? "Pending",
                    CreatedAt = DateTime.Now
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<ScheduleDto>> GetSchedulesByClassIdAsync(int classId)
        {
            return await _context.Schedules
                .Include(s => s.Class)
                .Where(s => s.ClassId == classId)
                .Select(s => new ScheduleDto
                {
                    ScheduleId = s.ScheduleId,
                    ClassId = s.ClassId,
                    ClassName = s.Class.ClassName ?? "",
                    ScheduleDate = s.ScheduleDate,
                    StartTime = s.StartTime,
                    EndTime = s.EndTime,
                    Notes = s.Notes,
                    Status = s.Status ?? "Pending",
                    CreatedAt = DateTime.Now
                })
                .ToListAsync();
        }

        public async Task<ScheduleDto?> GetScheduleByIdAsync(int id)
        {
            return await _context.Schedules
                .Include(s => s.Class)
                .Where(s => s.ScheduleId == id)
                .Select(s => new ScheduleDto
                {
                    ScheduleId = s.ScheduleId,
                    ClassId = s.ClassId,
                    ClassName = s.Class.ClassName ?? "",
                    ScheduleDate = s.ScheduleDate,
                    StartTime = s.StartTime,
                    EndTime = s.EndTime,
                    Notes = s.Notes,
                    Status = s.Status ?? "Pending",
                    CreatedAt = DateTime.Now
                })
                .FirstOrDefaultAsync();
        }

        public async Task<ScheduleDto> CreateScheduleAsync(CreateScheduleDto dto)
        {
            var classExists = await _context.Classes.FindAsync(dto.ClassId);
            if (classExists == null)
                throw new Exception("Class not found");

            if (dto.StartTime >= dto.EndTime)
                throw new Exception("Start time must be before end time");

            var schedule = new Schedule
            {
                ClassId = dto.ClassId,
                ScheduleDate = dto.ScheduleDate,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                Notes = dto.Notes,
                Status = dto.Status ?? "Pending"
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
                schedule.ScheduleDate = dto.ScheduleDate.Value;

            if (dto.StartTime.HasValue)
                schedule.StartTime = dto.StartTime.Value;

            if (dto.EndTime.HasValue)
                schedule.EndTime = dto.EndTime.Value;

            if (dto.Notes != null)
                schedule.Notes = dto.Notes;

            if (dto.Status != null)
                schedule.Status = dto.Status;

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

            if (schedule.Status == "Approved")
                throw new Exception("Schedule is already approved");

            schedule.Status = "Approved";
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RejectScheduleAsync(int id, string? reason)
        {
            var schedule = await _context.Schedules.FindAsync(id);
            if (schedule == null)
                return false;

            if (schedule.Status == "Rejected")
                throw new Exception("Schedule is already rejected");

            schedule.Status = "Rejected";
            if (!string.IsNullOrEmpty(reason))
                schedule.Notes = $"{schedule.Notes}\nRejection reason: {reason}".Trim();

            await _context.SaveChangesAsync();
            return true;
        }
    }
}
