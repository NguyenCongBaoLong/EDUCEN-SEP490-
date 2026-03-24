using EducenAPI.DTOs.Submissions;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SubmissionsController : ControllerBase
    {
        private readonly ISubmissionService _submissionService;

        public SubmissionsController(ISubmissionService submissionService)
        {
            _submissionService = submissionService;
        }

        [HttpPost]
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

        [HttpPut("{subId}/publish")]
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

        [HttpGet("{subId}")]
        public async Task<IActionResult> GetSubmissionById(int subId)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = await _submissionService.GetByIdAsync(subId, baseUrl);
            if (result == null)
                return NotFound(new { message = "Submission not found" });

            return Ok(result);
        }
    }
}