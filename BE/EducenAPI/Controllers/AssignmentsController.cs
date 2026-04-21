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
        [Authorize(Roles = "Teacher,Assistant,Admin")]
        public async Task<IActionResult> CreateAssignment([FromForm] CreateAssignmentDto dto)
        {
            try
            {
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var result = await _assignmentService.CreateAssignmentAsync(dto, baseUrl);
                return StatusCode(StatusCodes.Status201Created, result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Teacher,Assistant,Admin")]
        public async Task<IActionResult> UpdateAssignment(int id, [FromForm] CreateAssignmentDto dto)
        {
            try
            {
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var result = await _assignmentService.UpdateAssignmentAsync(id, dto, baseUrl);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet]
        [Authorize(Roles = "Teacher,Assistant,Admin,Student")]
        public async Task<IActionResult> GetAssignments()
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = await _assignmentService.GetAllAssignmentsAsync(baseUrl);
            return Ok(result);
        }

        [HttpGet("Get-By-Session/{sessionId}")]
        [Authorize(Roles = "Teacher,Assistant,Admin,Student")]
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
        [Authorize(Roles = "Teacher,Assistant,Admin")]
        public async Task<IActionResult> ImportAssignment([FromBody] EducenAPI.DTOs.Common.ImportDto dto)
        {
            try
            {
                var result = await _assignmentService.ImportAssignmentAsync(dto.SourceId, dto.TargetSessionId, dto.EndTime);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Teacher,Assistant,Admin")]
        public async Task<IActionResult> DeleteAssignment(int id)
        {
            var success = await _assignmentService.DeleteAssignmentAsync(id);
            if (!success) return NotFound();
            return NoContent();
        }

        [HttpGet("{id:int}/grading")]
        [Authorize(Roles = "Teacher,Assistant,Admin,Student")]
        public async Task<IActionResult> GetAssignmentGrading(int id)
        {
            try
            {
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var result = await _assignmentService.GetAssignmentGradingAsync(id, baseUrl);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("Assigned")]
        [Authorize(Roles = "Teacher,Assistant,Admin,Student")]
        public async Task<IActionResult> GetAssignedAssignments(string type)
        {
            try
            {
                var assignments = await _assignmentService.GetAssignedAssignments(type);
                return Ok(assignments);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id:int}/download-submissions")]
        [Authorize(Roles = "Teacher,Admin")]
        public async Task<IActionResult> DownloadSubmissions(int id)
        {
            try
            {
                var (content, fileName) = await _assignmentService.DownloadAllSubmissionsAsync(id);
                
                // Mã hóa tên file để hỗ trợ tiếng Việt có dấu trong header
                var encodedFileName = Uri.EscapeDataString(fileName);
                
                // Tạo phiên bản không dấu của tên file cho tham số filename (ASCII only)
                var asciiFileName = fileName.Normalize(System.Text.NormalizationForm.FormD);
                var stringBuilder = new System.Text.StringBuilder();
                foreach (var c in asciiFileName)
                {
                    var unicodeCategory = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
                    if (unicodeCategory != System.Globalization.UnicodeCategory.NonSpacingMark)
                    {
                        stringBuilder.Append(c);
                    }
                }
                var cleanFileName = stringBuilder.ToString().Normalize(System.Text.NormalizationForm.FormC).Replace(" ", "_");

                Response.Headers.Append("Content-Disposition", $"attachment; filename=\"{cleanFileName}\"; filename*=UTF-8''{encodedFileName}");
                Response.Headers.Append("Access-Control-Expose-Headers", "Content-Disposition");

                return File(content, "application/zip");
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
