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
            // Trim input
            request.Email = request.Email?.Trim();
            request.FirstName = request.FirstName?.Trim();
            request.LastName = request.LastName?.Trim();
            request.Phone = request.Phone?.Trim();

            // Validate required fields
            if (string.IsNullOrWhiteSpace(request.Email))
                throw new Exception("Email là bắt buộc.");
            if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName))
                throw new Exception("Họ và tên là bắt buộc.");

            // Check duplicate email trong enrollment requests (Pending)
            var existingPending = await _context.EnrollmentRequests
                .AnyAsync(r => r.Email == request.Email && r.Status == "Pending");
            if (existingPending)
                throw new Exception("Đã tồn tại yêu cầu đăng ký với email này.");

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

            // Generate username từ email
            var usernameFromEmail = request.Email?.Split('@')[0] ?? $"stu_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";

            // Check username đã tồn tại chưa
            var username = usernameFromEmail;
            int counter = 1;
            while (await _context.Users.AnyAsync(u => u.Username == username))
            {
                username = $"{usernameFromEmail}_{counter++}";
            }

            // Check email đã tồn tại trong Users chưa
            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                var emailExists = await _context.Users.AnyAsync(u => u.Email == request.Email);
                if (emailExists)
                    throw new Exception($"Email '{request.Email}' đã được sử dụng bởi tài khoản khác.");
            }

            // Tạo User và Student
            var user = new User
            {
                Username = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Edu123456"),
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
