// using System.Collections.Generic;
// using System.Threading.Tasks;
// using EducenAPI.Models;

// namespace EducenAPI.Services.Interface
// {
//     public interface IEnrollmentRequestService
//     {
//         Task<IEnumerable<EnrollmentRequest>> GetAllRequestsAsync();
//         Task<IEnumerable<EnrollmentRequest>> GetPendingRequestsAsync();
//         Task<EnrollmentRequest?> GetRequestByIdAsync(int id);
//         Task<EnrollmentRequest> CreateRequestAsync(EnrollmentRequest request);
//         Task<EnrollmentRequest?> ApproveRequestAsync(int id, int reviewedBy);
//         Task<bool> RejectRequestAsync(int id, string reason, int reviewedBy);
//     }
// }
