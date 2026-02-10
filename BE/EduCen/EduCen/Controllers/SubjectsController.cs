using EduCen.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Linq;
using System;
using EduCen.Properties.DTOs;

namespace EduCen.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SubjectsController : ControllerBase
    {
        private readonly EduCenV2Context _context;

        public SubjectsController(EduCenV2Context context)
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
            var subject = new Subject
            {
                SubjectName = request.SubjectName,
                Description = request.Description
            };

            _context.Subjects.Add(subject);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetSubject),
                new { id = subject.SubjectId },
                subject);
        }


        // PUT: api/Subjects/5
        // PUT: api/Subjects/5
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateSubject(
            int id,
            [FromBody] UpdateSubjectRequest request)
        {
            var existingSubject = await _context.Subjects.FindAsync(id);

            if (existingSubject == null)
                return NotFound();

            // Update only allowed fields
            existingSubject.SubjectName = request.SubjectName;
            existingSubject.Description = request.Description;

            await _context.SaveChangesAsync();

            return NoContent();
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

        // GET: api/Subjects/test-db
        //test DB connection
        //[HttpGet("test-db")]
        //public IActionResult TestDbConnection()
        //{
        //    try
        //    {
        //        _context.Database.OpenConnection();
        //        _context.Database.CloseConnection();

        //        return Ok("Database connection successful.");
        //    }
        //    catch (Exception ex)
        //    {
        //        return StatusCode(500,
        //            $"Database connection failed: {ex.Message}");
        //    }
        //}
    }
    

}
