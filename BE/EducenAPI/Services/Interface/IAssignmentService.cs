using EducenAPI.DTOs.Assignments;
using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface IAssignmentService
    {
        Task<Assignment> CreateAssignmentAsync(CreateAssignmentDto dto);
        Task<List<AssignmentResponseDto>> GetAssignmentsBySessionAsync(int sessionId, string baseUrl);
    }
}
