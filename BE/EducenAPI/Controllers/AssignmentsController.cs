using EducenAPI.DTOs.Assignments;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AssignmentsController : ControllerBase
    {
        private readonly IAssignmentService _assignmentService;

        public AssignmentsController(IAssignmentService assignmentService)
        {
            _assignmentService = assignmentService;
        }

        [HttpPost("Create-Assignments")]
        public async Task<IActionResult> CreateAssignment([FromForm] CreateAssignmentDto dto)
        {
            var result = await _assignmentService.CreateAssignmentAsync(dto);
            return Ok(result);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateAssignment(int id, [FromForm] CreateAssignmentDto dto)
        {
            var result = await _assignmentService.UpdateAssignmentAsync(id, dto);
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAssignments()
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = await _assignmentService.GetAllAssignmentsAsync(baseUrl);
            return Ok(result);
        }

        [HttpGet("Get-By-Session/{sessionId}")]
        public async Task<IActionResult> GetAssignmentsBySession(int sessionId)
        {
          
            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            var result = await _assignmentService.GetAssignmentsBySessionAsync(sessionId, baseUrl);

            if (result == null || !result.Any())
            {
                return Ok(new List<AssignmentResponseDto>());
            }

            return Ok(result);
        }

        [HttpPost("import")]
        public async Task<IActionResult> ImportAssignment([FromBody] EducenAPI.DTOs.Common.ImportDto dto)
        {
            var result = await _assignmentService.ImportAssignmentAsync(dto.SourceId, dto.TargetSessionId, dto.EndTime);
            return Ok(result);
        }
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteAssignment(int id)
        {
            var success = await _assignmentService.DeleteAssignmentAsync(id);
            if (!success) return NotFound();
            return NoContent();
        }
    }
}
