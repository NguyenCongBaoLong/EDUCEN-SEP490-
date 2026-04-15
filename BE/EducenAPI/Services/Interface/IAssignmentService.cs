using EducenAPI.DTOs.Assignments;
using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface IAssignmentService
    {
        Task<AssignmentResponseDto> CreateAssignmentAsync(CreateAssignmentDto dto, string baseUrl);
        Task<AssignmentResponseDto> UpdateAssignmentAsync(int id, CreateAssignmentDto dto, string baseUrl);
        Task<List<AssignmentResponseDto>> GetAssignmentsBySessionAsync(int sessionId, string baseUrl);
        Task<List<AssignmentResponseDto>> GetAllAssignmentsAsync(string baseUrl);
        Task<Assignment> ImportAssignmentAsync(int assignmentId, int sessionId, DateTime? endTime = null);
        Task<bool> DeleteAssignmentAsync(int id);
        Task<AssignmentGradingDto> GetAssignmentGradingAsync(int assignmentId, string baseUrl);
        Task<List<Assignment>> GetAssignedAssignments(string? type);
    }
}
