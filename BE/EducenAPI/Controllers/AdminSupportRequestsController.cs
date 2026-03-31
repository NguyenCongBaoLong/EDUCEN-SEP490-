using EducenAPI.DTOs.SupportRequestDTOs;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EducenAPI.Controllers
{
    [Route("api/admin/support-requests")]
    [ApiController]
    [Authorize]
    public class AdminSupportRequestsController : ControllerBase
    {
        private readonly ISupportRequestsService _service;
        private readonly IUserContextService _userContext;
        public AdminSupportRequestsController(ISupportRequestsService service, IUserContextService userContext)
        {
            _service = service;
            _userContext = userContext;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            return Ok(result);
        }

        [HttpPut("{id}/reply")]
        public async Task<IActionResult> Reply(int id, [FromBody] ReplySupportRequestDto dto)
        {
            var adminId = _userContext.GetUserId();
            var result = await _service.ReplyAsync(adminId, id, dto);
            return Ok(result);
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var success = await _service.MarkAsReadAsync(id);
            if (!success) return NotFound("Không tìm thấy request.");
            return Ok("Đã đánh dấu đã đọc.");
        }
    }
}
