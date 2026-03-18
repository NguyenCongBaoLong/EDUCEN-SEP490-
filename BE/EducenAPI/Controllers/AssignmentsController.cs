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

        [HttpGet("Get-By-Session/{sessionId}")]
        public async Task<IActionResult> GetAssignmentsBySession(int sessionId)
        {
          
            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            var result = await _assignmentService.GetAssignmentsBySessionAsync(sessionId, baseUrl);

            if (result == null || !result.Any())
            {
                return NotFound(new { message = "Không tìm thấy bài tập nào cho buổi học này." });
            }

            return Ok(result);
        }
    }
}
