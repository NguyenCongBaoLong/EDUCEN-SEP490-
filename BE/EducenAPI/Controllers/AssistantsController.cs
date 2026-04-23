using EducenAPI.DTOs.Assistants;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AssistantsController : ControllerBase
    {
        private readonly IAssistantService _assistantService;

        public AssistantsController(IAssistantService assistantService)
        {
            _assistantService = assistantService;
        }

        // GET: api/Assistants
        [HttpGet]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> GetAssistants()
        {
            var assistants = await _assistantService.GetAllAssistantsAsync();
            return Ok(assistants);
        }

        // GET: api/Assistants/5
        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin,TenantAdmin,Assistant")]
        public async Task<IActionResult> GetAssistant(int id)
        {
            var assistant = await _assistantService.GetAssistantByIdAsync(id);

            if (assistant == null)
                return NotFound(new { message = "Không tìm thấy trợ giảng" });

            return Ok(assistant);
        }

        // POST: api/Assistants
        [HttpPost]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> CreateAssistant(CreateAssistantDto dto)
        {
            try
            {
                var assistant = await _assistantService.CreateAssistantAsync(dto);
                return CreatedAtAction(nameof(GetAssistant), new { id = assistant.AssistantId }, assistant);
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT: api/Assistants/5
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> UpdateAssistant(int id, UpdateAssistantDto dto)
        {
            try
            {
                var success = await _assistantService.UpdateAssistantAsync(id, dto);
                if (!success)
                    return NotFound(new { message = "Không tìm thấy trợ giảng" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // DELETE: api/Assistants/5
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> DeleteAssistant(int id)
        {
            try
            {
                var success = await _assistantService.DeleteAssistantAsync(id);
                if (!success)
                    return NotFound(new { message = "Không tìm thấy trợ giảng" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/Assistants/5/classes
        [HttpGet("{id:int}/classes")]
        [Authorize(Roles = "Admin,TenantAdmin,Assistant")]
        public async Task<IActionResult> GetAssistantClasses(int id)
        {
            var classes = await _assistantService.GetAssistantClassesAsync(id);
            return Ok(classes);
        }

        // POST: api/Assistants/send-account/5
        [HttpPost("send-account/{id:int}")]
        [HttpPost("{id:int}/send-account")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> SendAccount(int id)
        {
            try
            {
                await _assistantService.SendAccountAsync(id);
                return Ok(new { message = "Đã gửi tài khoản trợ giảng qua email." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}