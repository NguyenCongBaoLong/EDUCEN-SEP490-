using EducenAPI.DTOs.Schedules;

namespace EducenAPI.Services.Interface
{
    public interface IScheduleService
    {
        Task<IEnumerable<ScheduleDto>> GetAllSchedulesAsync();
        Task<IEnumerable<ScheduleDto>> GetSchedulesByClassIdAsync(int classId);
        Task<ScheduleDto?> GetScheduleByIdAsync(int id);
        Task<ScheduleDto> CreateScheduleAsync(CreateScheduleDto dto);
        Task<bool> UpdateScheduleAsync(int id, UpdateScheduleDto dto);
        Task<bool> DeleteScheduleAsync(int id);
        
        // Personal schedule methods
        Task<IEnumerable<TeacherScheduleDto>> GetTeacherScheduleAsync(int userId);
        Task<IEnumerable<TeacherScheduleDto>> GetAssistantScheduleAsync(int userId);
        Task<IEnumerable<StudentScheduleDto>> GetStudentScheduleAsync(int userId);
    }
}
