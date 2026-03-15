using EducenAPI.DTOs.Assignments;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AssignmentsController : ControllerBase
    {
        private readonly IAssignmentService _assignmentService;

        public AssignmentsController(IAssignmentService assignmentService)
        {
            _assignmentService = assignmentService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateAssignment([FromForm] CreateAssignmentDto dto)
        {
            var result = await _assignmentService.CreateAssignmentAsync(dto);
            return Ok(result);
        }
    }
}
