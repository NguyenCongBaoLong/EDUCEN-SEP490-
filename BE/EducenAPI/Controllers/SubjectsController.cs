using EducenAPI.DTOs;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SubjectsController : ControllerBase
    {
        private readonly ISubjectService _subjectService;

        public SubjectsController(ISubjectService subjectService)
        {
            _subjectService = subjectService;
        }

        // GET: api/Subjects
        [HttpGet]
        public async Task<IActionResult> GetSubjects()
        {
            var subjects = await _subjectService.GetAllSubjectsAsync();
            return Ok(subjects);
        }

        // GET: api/Subjects/5
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetSubject(int id)
        {
            var subject = await _subjectService.GetSubjectByIdAsync(id);
            if (subject == null)
                return NotFound(new { message = "Subject not found" });

            return Ok(subject);
        }

        // POST: api/Subjects
        [HttpPost]
        public async Task<IActionResult> CreateSubject(CreateSubjectRequest request)
        {
            var subject = await _subjectService.CreateSubjectAsync(request);
            return CreatedAtAction(nameof(GetSubject),
                new { id = subject.SubjectId },
                subject);
        }

        // PUT: api/Subjects/5
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateSubject(int id, [FromBody] UpdateSubjectRequest request)
        {
            var success = await _subjectService.UpdateSubjectAsync(id, request);
            if (!success)
                return NotFound(new { message = "Subject not found" });

            return NoContent();
        }

        // DELETE: api/Subjects/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteSubject(int id)
        {
            var subject = await _subjectService.GetSubjectByIdAsync(id);
            if (subject == null)
                return NotFound(new { message = "Subject not found" });

            var isUsed = await _subjectService.IsSubjectUsedInClassesAsync(id);
            if (isUsed)
                return BadRequest(new { message = "Cannot delete subject: it is used by one or more classes." });

            await _subjectService.DeleteSubjectAsync(id);
            return NoContent();
        }
    }
}
