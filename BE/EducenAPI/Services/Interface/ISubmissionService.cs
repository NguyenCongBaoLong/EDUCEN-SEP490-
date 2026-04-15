using EducenAPI.DTOs.Submissions;
using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface ISubmissionService
    {
        Task<SubmissionResponseDto> CreateSubmissionAsync(CreateSubmissionRequest request, string baseUrl);
        Task<SubmissionResponseDto> UpdateSubmissionAsync(int subId, UpdateSubmissionRequest request, string baseUrl);
        Task<SubmissionResponseDto> GradeSubmissionAsync(int subId, GradeSubmissionRequest request, string baseUrl);
        Task<SubmissionResponseDto> GradeWithoutSubmissionAsync(int assignmentId, int studentId, GradeSubmissionRequest request, string baseUrl);
        Task<SubmissionResponseDto> PublishGradeAsync(int subId, bool isPublished, string baseUrl);
        Task<SubmissionResponseDto> ResetSubmissionAsync(int subId, string baseUrl);
        Task<SubmissionResponseDto?> GetByIdAsync(int subId, string baseUrl);
        Task<bool> PublishAllGradesAsync(int assignmentId, bool isPublished);
    }
}
