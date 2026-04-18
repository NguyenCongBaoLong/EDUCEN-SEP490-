using EducenAPI.DTOs.TenantRegistrations;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/registrations")]
    public class TenantRegistrationsController : ControllerBase
    {
        private readonly ITenantRegistrationService _service;

        public TenantRegistrationsController(ITenantRegistrationService service)
        {
            _service = service;
        }

        // Khách gửi form đăng ký
        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> Create(CreateRegistrationRequest request)
        {
            var result = await _service.CreateRegistrationAsync(request);

            return Ok(result);
        }

        // SystemAdmin xem danh sách
        [HttpGet]
        
        public async Task<IActionResult> GetAll()
        {
            var data = await _service.GetAllAsync();

            return Ok(data);
        }

        // SystemAdmin duyệt hoặc từ chối
        [HttpPut("{id}/status")]
        
        public async Task<IActionResult> UpdateStatus(string id, string status, [FromQuery] string? reason = null)
        {
            if (status != "Approved" && status != "Rejected")
                return BadRequest(new { message = "Trạng thái không hợp lệ. Chỉ chấp nhận 'Approved' hoặc 'Rejected'." });

            var result = await _service.UpdateStatusAsync(id, status, reason);

            if (!result)
                return NotFound();

            return Ok();
        }
    }
}
