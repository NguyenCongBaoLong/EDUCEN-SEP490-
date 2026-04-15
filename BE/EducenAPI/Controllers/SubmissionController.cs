using EducenAPI.DTOs.Submissions;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SubmissionsController : ControllerBase
    {
        private readonly ISubmissionService _submissionService;

        public SubmissionsController(ISubmissionService submissionService)
        {
            _submissionService = submissionService;
        }

        [HttpPost]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> CreateSubmission([FromForm] CreateSubmissionRequest request)
        {
            try
            {
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var result = await _submissionService.CreateSubmissionAsync(request, baseUrl);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{subId}")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> UpdateSubmission(int subId, [FromForm] UpdateSubmissionRequest request)
        {
            try
            {
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var result = await _submissionService.UpdateSubmissionAsync(subId, request, baseUrl);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{subId}/grade")]
        [Authorize(Roles = "Teacher,Assistant,Admin")]
        public async Task<IActionResult> GradeSubmission(int subId, [FromBody] GradeSubmissionRequest request)
        {
            try
            {
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var result = await _submissionService.GradeSubmissionAsync(subId, request, baseUrl);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("assignment/{assignmentId}/student/{studentId}/grade")]
        [Authorize(Roles = "Teacher,Assistant,Admin")]
        public async Task<IActionResult> GradeWithoutSubmission(int assignmentId, int studentId, [FromBody] GradeSubmissionRequest request)
        {
            try
            {
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var result = await _submissionService.GradeWithoutSubmissionAsync(assignmentId, studentId, request, baseUrl);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{subId}/publish")]
        [Authorize(Roles = "Teacher,Assistant,Admin")]
        public async Task<IActionResult> PublishGrade(int subId, [FromBody] PublishGradeRequest request)
        {
            try
            {
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var result = await _submissionService.PublishGradeAsync(subId, request.IsPublished, baseUrl);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{subId}/reset")]
        [Authorize(Roles = "Teacher,Admin")]
        public async Task<IActionResult> ResetSubmission(int subId)
        {
            try
            {
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var result = await _submissionService.ResetSubmissionAsync(subId, baseUrl);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("assignment/{assignmentId}/publish-all")]
        [Authorize(Roles = "Teacher,Assistant,Admin")]
        public async Task<IActionResult> PublishAllGrades(int assignmentId, [FromBody] PublishGradeRequest request)
        {
            try
            {
                var result = await _submissionService.PublishAllGradesAsync(assignmentId, request.IsPublished);
                if (!result)
                    return NotFound(new { message = "Không tìm thấy bài nộp đã chấm điểm nào cho bài tập này." });

                return Ok(new { message = request.IsPublished ? "Đã công bố tất cả điểm thành công." : "Đã hủy công bố tất cả điểm thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{subId}")]
        [Authorize(Roles = "Teacher,Assistant,Admin,Student")]
        public async Task<IActionResult> GetSubmissionById(int subId)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = await _submissionService.GetByIdAsync(subId, baseUrl);
            if (result == null)
                return NotFound(new { message = "Không tìm thấy bài nộp." });

            return Ok(result);
        }
    }
}