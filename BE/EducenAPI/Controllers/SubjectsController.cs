using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using EducenAPI.Models;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Linq;
using System;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using EducenAPI.DTOs.Subjects;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/tenantadmin/[controller]")]
    public class SubjectsController : ControllerBase
    {
        private readonly EducenV2Context _context;

        public SubjectsController(EducenV2Context context)
        {
            _context = context;
        }

        // GET: api/Subjects
        [HttpGet]
        public async Task<IActionResult> GetSubjects()
        {
            var subjects = await _context.Subjects.ToListAsync();
            return Ok(subjects);
        }

        // GET: api/Subjects/5
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetSubject(int id)
        {
            var subject = await _context.Subjects.FindAsync(id);

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
            var subject = await _context.Subjects.FindAsync(id);
            if (subject == null)
                return NotFound();

            bool isUsed = await _context.Classes
                                        .AnyAsync(c => c.SubjectId == id);

            if (isUsed)
                return BadRequest(
                    "Cannot delete subject: it is used by one or more classes."
                );

            _context.Subjects.Remove(subject);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        
       [HttpGet("test-db")]
        public IActionResult TestDbConnection()
        {
            try
            {
                _context.Database.OpenConnection();
                _context.Database.CloseConnection();

                return Ok("Database connection successful.");
            }
            catch (Exception ex)
            {
                return StatusCode(500,
                    $"Database connection failed: {ex.Message}");
            }
        }
    }


}
