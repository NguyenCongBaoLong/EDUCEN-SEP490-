using EducenAPI.DTOs.TenantRegistrations;
using EducenAPI.Services.Interface;
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
        public async Task<IActionResult> Create(CreateRegistrationRequest request)
        {
            var result = await _service.CreateRegistrationAsync(request);

            return Ok(result);
        }

        // Admin xem danh sách
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _service.GetAllAsync();

            return Ok(data);
        }

        // Admin duyệt hoặc từ chối
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(string id, string status)
        {
            var result = await _service.UpdateStatusAsync(id, status);

            if (!result)
                return NotFound();

            return Ok();
        }
    }
}