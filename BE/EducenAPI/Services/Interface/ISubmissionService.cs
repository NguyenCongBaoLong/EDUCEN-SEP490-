using EducenAPI.DTOs.Submissions;
using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface ISubmissionService
    {
        Task<Submission> CreateSubmissionAsync(CreateSubmissionRequest request);
        Task<Submission> UpdateSubmissionAsync(int subId, UpdateSubmissionRequest request);
        Task<Submission> GradeSubmissionAsync(int subId, GradeSubmissionRequest request);
        Task<Submission> PublishGradeAsync(int subId, bool isPublished);
        Task<Submission?> GetByIdAsync(int subId);
    }
}
