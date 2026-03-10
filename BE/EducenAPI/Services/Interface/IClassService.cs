using EducenAPI.DTOs.Classes;
using EducenAPI.DTOs.Students;

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
        Task<bool> ClassExistsAsync(int id);
        Task<bool> ImportStudentToClassAsync(int classId, CreateStudentDto studentDto);
    }
}
