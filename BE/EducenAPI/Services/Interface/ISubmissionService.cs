using EducenAPI.DTOs.Submissions;
using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface ISubmissionService
    {
        Task<SubmissionResponseDto> CreateSubmissionAsync(CreateSubmissionRequest request);
        Task<SubmissionResponseDto> UpdateSubmissionAsync(int subId, UpdateSubmissionRequest request);
        Task<SubmissionResponseDto> GradeSubmissionAsync(int subId, GradeSubmissionRequest request);
        Task<SubmissionResponseDto> PublishGradeAsync(int subId, bool isPublished);
        Task<SubmissionResponseDto> ResetSubmissionAsync(int subId);
        Task<SubmissionResponseDto?> GetByIdAsync(int subId);
    }
}
