using EducenAPI.DTOs.Assignments;
using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface IAssignmentService
    {
        Task<Assignment> CreateAssignmentAsync(CreateAssignmentDto dto);
        Task<Assignment> UpdateAssignmentAsync(int id, CreateAssignmentDto dto);
        Task<List<AssignmentResponseDto>> GetAssignmentsBySessionAsync(int sessionId, string baseUrl);
        Task<List<AssignmentResponseDto>> GetAllAssignmentsAsync(string baseUrl);
        Task<Assignment> ImportAssignmentAsync(int assignmentId, int sessionId, DateTime? endTime = null);
        Task<bool> DeleteAssignmentAsync(int id);
        Task<AssignmentGradingDto> GetAssignmentGradingAsync(int assignmentId, string baseUrl);
    }
}
