using System.Collections.Generic;
using System.Threading.Tasks;
using EducenAPI.Models;
using EducenAPI.DTOs.EnrollmentRequests;

namespace EducenAPI.Services.Interface
{
    public interface IEnrollmentRequestService
    {
        Task<IEnumerable<EnrollmentRequestDto>> GetAllRequestsAsync();
        Task<IEnumerable<EnrollmentRequestDto>> GetPendingRequestsAsync();
        Task<IEnumerable<EnrollmentRequestDto>> GetMyRequestsAsync(int userId);
        Task<EnrollmentRequestDto?> GetRequestByIdAsync(int id);
        Task<EnrollmentRequest> CreateRequestAsync(EnrollmentRequest request);
        Task<EnrollmentRequest?> ApproveRequestAsync(int id);
        Task<bool> RejectRequestAsync(int id);
        Task<bool> IsScheduleConflictingAsync(int studentId, int classId);
        Task<bool> IsClassFullAsync(int classId);
        Task<EnrollmentRequest> CreateStudentEnrollmentRequestAsync(int studentId, int gradeId, int classId);
    }
}
