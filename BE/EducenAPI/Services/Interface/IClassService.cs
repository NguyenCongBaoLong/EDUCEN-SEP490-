using EducenAPI.DTOs.Classes;

namespace EducenAPI.Services.Interface
{
    public interface IClassService
    {
        Task<IEnumerable<ClassDto>> GetAllClassesAsync();
        Task<ClassDto?> GetClassByIdAsync(int id);
        Task<ClassDto> CreateClassAsync(CreateClassDto dto);
        Task<bool> UpdateClassAsync(int id, UpdateClassDto dto);
        Task<bool> DeleteClassAsync(int id);
        Task<bool> AssignTeacherAsync(int classId, int teacherId);
        Task<bool> AssignAssistantAsync(int classId, int assistantId);
        Task<bool> AddStudentToClassAsync(int classId, int studentId);
        Task<bool> RemoveStudentFromClassAsync(int classId, int studentId);
    }
}
