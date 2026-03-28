using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
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
        public async Task<IActionResult> GetAllRequests()
        {
            var requests = await _service.GetAllRequestsAsync();
            return Ok(requests);
        }

        // GET: api/enrollment-requests/pending
        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingRequests()
        {
            var requests = await _service.GetPendingRequestsAsync();
            return Ok(requests);
        }

        // GET: api/enrollment-requests/{id}
        [HttpGet("{id:int}")]
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
        public async Task<IActionResult> CreateRequest([FromBody] EnrollmentRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
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

        // PUT: api/enrollment-requests/{id}/reject
        [HttpPut("{id:int}/reject")]
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
    }
}
