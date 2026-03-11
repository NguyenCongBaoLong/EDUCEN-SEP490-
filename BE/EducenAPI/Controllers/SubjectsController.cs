using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;
using EducenAPI.Services.Interface;
using EducenAPI.DTOs.Subjects;
using Microsoft.AspNetCore.Authorization;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/tenantadmin/[controller]")]
    [Authorize]
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
                return NotFound();

            return Ok(subject);
        }

        // POST: api/Subjects
        [HttpPost]
        public async Task<IActionResult> CreateSubject(CreateSubjectRequest request)
        {
            try
            {
                var subject = await _subjectService.CreateSubjectAsync(request);

                return CreatedAtAction(
                    nameof(GetSubject),
                    new { id = subject.SubjectId },
                    subject);
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }


        // PUT: api/Subjects/5
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateSubject(
            int id,
            [FromBody] UpdateSubjectRequest request)
        {
            try
            {
                var success = await _subjectService.UpdateSubjectAsync(id, request);
                if (!success)
                    return NotFound(new { message = "Subject not found" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }


        // DELETE: api/Subjects/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteSubject(int id)
        {
            try
            {
                var success = await _subjectService.DeleteSubjectAsync(id);
                if (!success)
                    return NotFound(new { message = "Subject not found" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
