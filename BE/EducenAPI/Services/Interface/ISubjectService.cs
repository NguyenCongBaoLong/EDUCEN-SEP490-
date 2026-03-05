using EducenAPI.DTOs.Subjects;
using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface ISubjectService
    {
        Task<IEnumerable<Subject>> GetAllSubjectsAsync();
        Task<Subject?> GetSubjectByIdAsync(int id);
        Task<Subject> CreateSubjectAsync(CreateSubjectRequest request);
        Task<bool> UpdateSubjectAsync(int id, UpdateSubjectRequest request);
        Task<bool> DeleteSubjectAsync(int id);
        Task<bool> IsSubjectUsedInClassesAsync(int id);
    }
}
