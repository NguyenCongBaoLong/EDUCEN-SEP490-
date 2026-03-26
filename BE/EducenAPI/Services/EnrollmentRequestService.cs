using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class EnrollmentRequestService : IEnrollmentRequestService
    {
        private readonly EducenV2Context _context;

        public EnrollmentRequestService(EducenV2Context context)
        {
            _context = context;
        }

        public async Task<IEnumerable<EnrollmentRequest>> GetAllRequestsAsync()
        {
            return await _context.EnrollmentRequests
                .OrderByDescending(r => r.RequestDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<EnrollmentRequest>> GetPendingRequestsAsync()
        {
            return await _context.EnrollmentRequests
                .Where(r => r.Status == "Pending")
                .OrderByDescending(r => r.RequestDate)
                .ToListAsync();
        }

        public async Task<EnrollmentRequest?> GetRequestByIdAsync(int id)
        {
            return await _context.EnrollmentRequests.FindAsync(id);
        }

        public async Task<EnrollmentRequest> CreateRequestAsync(EnrollmentRequest request)
        {
            request.Status = "Pending";
            request.RequestDate = DateTime.UtcNow;

            _context.EnrollmentRequests.Add(request);
            await _context.SaveChangesAsync();

            return request;
        }

        public async Task<EnrollmentRequest?> ApproveRequestAsync(int id)
        {
            var request = await _context.EnrollmentRequests.FindAsync(id);

            if (request == null)
                return null;

            if (request.Status != "Pending")
                throw new Exception("Yêu cầu đã được xử lý trước đó");

            // Tạo User và Student
            // Username = phần đằng trước @ của email
            var usernameFromEmail = request.Email?.Split('@')[0] ?? $"stu_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
            var user = new User
            {
                Username = usernameFromEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Edu123456"), // Mật khẩu mặc định
                FullName = $"{request.FirstName} {request.LastName}".Trim(),
                Email = request.Email,
                PhoneNumber = request.Phone,
                RoleId = 3, // Student role
                AccountStatus = "Active",
                IsAccountSent = false,
                Address = request.Address
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Tạo Student record
            var student = new Student
            {
                UserId = user.UserId,
                EnrollmentStatus = "Active",
                Grade = request.PreferredCourse
            };

            _context.Students.Add(student);
            await _context.SaveChangesAsync();

            // Cập nhật request
            request.Status = "Approved";
            request.CreatedStudentId = student.UserId;

            await _context.SaveChangesAsync();

            return request;
        }

        public async Task<bool> RejectRequestAsync(int id)
        {
            var request = await _context.EnrollmentRequests.FindAsync(id);

            if (request == null)
                return false;

            if (request.Status != "Pending")
                throw new Exception("Yêu cầu đã được xử lý trước đó");

            request.Status = "Rejected";

            await _context.SaveChangesAsync();

            return true;
        }
    }
}
