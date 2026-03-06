using EducenAPI.DTOs.Teachers;

namespace EducenAPI.Services.Interface
{
    public interface ITeacherService
    {
        Task<IEnumerable<TeacherDto>> GetAllTeachersAsync();
        Task<TeacherDto?> GetTeacherByIdAsync(int id);
        Task<TeacherDto> CreateTeacherAsync(CreateTeacherDto dto);
        Task<bool> UpdateTeacherAsync(int id, UpdateTeacherDto dto);
        Task<bool> DeleteTeacherAsync(int id);
        Task<object> GetTeacherClassesAsync(int id);
    }
}
