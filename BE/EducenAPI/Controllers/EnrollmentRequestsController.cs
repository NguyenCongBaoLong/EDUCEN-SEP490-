using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using EducenAPI.DTOs.EnrollmentRequests;
using EducenAPI.Models;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/enrollment-requests")]
    [ApiController]
    [Authorize]
    public class EnrollmentRequestsController : ControllerBase
    {
        private readonly IEnrollmentRequestService _service;

        public EnrollmentRequestsController(IEnrollmentRequestService service)
        {
            _service = service;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : 0;
        }

        // GET: api/enrollment-requests
        [HttpGet]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> GetAllRequests()
        {
            var requests = await _service.GetAllRequestsAsync();
            return Ok(requests);
        }

        // GET: api/enrollment-requests/pending
        [HttpGet("pending")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> GetPendingRequests()
        {
            var requests = await _service.GetPendingRequestsAsync();
            return Ok(requests);
        }

        // GET: api/enrollment-requests/{id}
        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> GetRequestById(int id)
        {
            var request = await _service.GetRequestByIdAsync(id);
            if (request == null)
                return NotFound(new { message = "Không tìm thấy yêu cầu" });

            return Ok(request);
        }

        // POST: api/enrollment-requests (Public - no auth required for submission)
        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> CreateRequest([FromBody] CreateEnrollmentRequestDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var request = new EnrollmentRequest
                {
                    FirstName = dto.FirstName,
                    LastName = dto.LastName,
                    Email = dto.Email,
                    Phone = dto.Phone ?? string.Empty,
                    Address = dto.Address,
                    PreferredCourse = dto.PreferredCourse,
                    ParentName = dto.ParentName,
                    ParentPhone = dto.ParentPhone,
                    ParentEmail = dto.ParentEmail,
                    GradeId = dto.GradeId,
                    ClassId = dto.ClassId,
                    RequestType = "GuestRegistration"
                };

                var created = await _service.CreateRequestAsync(request);
                return Ok(new
                {
                    message = "Đăng ký thành công! Chúng tôi sẽ liên hệ với bạn sớm.",
                    requestId = created.RequestId
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/enrollment-requests/{id}/approve
        [HttpPut("{id:int}/approve")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> ApproveRequest(int id)
        {
            try
            {
                var result = await _service.ApproveRequestAsync(id);

                if (result == null)
                    return NotFound(new { message = "Không tìm thấy yêu cầu" });

                return Ok(new
                {
                    message = "Đã duyệt yêu cầu và tạo tài khoản học sinh",
                    studentId = result.CreatedStudentId
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id:int}/reject")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> RejectRequest(int id)
        {
            try
            {
                var success = await _service.RejectRequestAsync(id);

                if (!success)
                    return NotFound(new { message = "Không tìm thấy yêu cầu" });

                return Ok(new { message = "Đã từ chối yêu cầu" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/enrollment-requests/my-requests (Student only)
        [HttpGet("my-requests")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> GetMyRequests()
        {
            var userId = GetCurrentUserId();
            var requests = await _service.GetMyRequestsAsync(userId);
            return Ok(requests);
        }

        // POST: api/enrollment-requests/student-enroll
        [HttpPost("student-enroll")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> CreateStudentEnrollmentRequest([FromBody] StudentEnrollmentRequestDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                var created = await _service.CreateStudentEnrollmentRequestAsync(userId, dto.GradeId, dto.ClassId);

                return Ok(new 
                { 
                    message = "Gửi yêu cầu đăng ký lớp học thành công! Vui lòng chờ Admin duyệt.",
                    requestId = created.RequestId
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class StudentEnrollmentRequestDto
    {
        public int GradeId { get; set; }
        public int ClassId { get; set; }
    }
}
