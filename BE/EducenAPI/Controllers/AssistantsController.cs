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
        public async Task<IActionResult> GetAssistants()
        {
            var assistants = await _assistantService.GetAllAssistantsAsync();
            return Ok(assistants);
        }

        // GET: api/Assistants/5
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetAssistant(int id)
        {
            var assistant = await _assistantService.GetAssistantByIdAsync(id);

            if (assistant == null)
                return NotFound(new { message = "Assistant not found" });

            return Ok(assistant);
        }

        // POST: api/Assistants
        [HttpPost]
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
        public async Task<IActionResult> UpdateAssistant(int id, UpdateAssistantDto dto)
        {
            try
            {
                var success = await _assistantService.UpdateAssistantAsync(id, dto);
                if (!success)
                    return NotFound(new { message = "Assistant not found" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // DELETE: api/Assistants/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteAssistant(int id)
        {
            try
            {
                var success = await _assistantService.DeleteAssistantAsync(id);
                if (!success)
                    return NotFound(new { message = "Assistant not found" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
