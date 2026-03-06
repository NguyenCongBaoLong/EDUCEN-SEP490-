using EducenAPI.DTOs.Classes;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ClassesController : ControllerBase
    {
        private readonly IClassService _classService;

        public ClassesController(IClassService classService)
        {
            _classService = classService;
        }

        // GET: api/Classes
        [HttpGet]
        public async Task<IActionResult> GetClasses()
        {
            var classes = await _classService.GetAllClassesAsync();
            return Ok(classes);
        }

        // GET: api/Classes/5
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetClass(int id)
        {
            var classItem = await _classService.GetClassByIdAsync(id);

            if (classItem == null)
                return NotFound(new { message = "Class not found" });

            return Ok(classItem);
        }

        // POST: api/Classes
        [HttpPost]
        public async Task<IActionResult> CreateClass(CreateClassDto dto)
        {
            try
            {
                var classItem = await _classService.CreateClassAsync(dto);
                return CreatedAtAction(nameof(GetClass), new { id = classItem.ClassId }, classItem);
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT: api/Classes/5
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateClass(int id, UpdateClassDto dto)
        {
            try
            {
                var success = await _classService.UpdateClassAsync(id, dto);
                if (!success)
                    return NotFound(new { message = "Class not found" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // DELETE: api/Classes/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteClass(int id)
        {
            try
            {
                var success = await _classService.DeleteClassAsync(id);
                if (!success)
                    return NotFound(new { message = "Class not found" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/Classes/5/assign-teacher/{teacherId}
        [HttpPut("{id:int}/assign-teacher/{teacherId:int}")]
        public async Task<IActionResult> AssignTeacher(int id, int teacherId)
        {
            try
            {
                var success = await _classService.AssignTeacherAsync(id, teacherId);
                if (!success)
                    return NotFound(new { message = "Class not found" });

                return Ok(new { message = "Teacher assigned successfully" });
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT: api/Classes/5/assign-assistant/{assistantId}
        [HttpPut("{id:int}/assign-assistant/{assistantId:int}")]
        public async Task<IActionResult> AssignAssistant(int id, int assistantId)
        {
            try
            {
                var success = await _classService.AssignAssistantAsync(id, assistantId);
                if (!success)
                    return NotFound(new { message = "Class not found" });

                return Ok(new { message = "Assistant assigned successfully" });
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // POST: api/Classes/5/students/{studentId}
        [HttpPost("{id:int}/students/{studentId:int}")]
        public async Task<IActionResult> AddStudentToClass(int id, int studentId)
        {
            try
            {
                var success = await _classService.AddStudentToClassAsync(id, studentId);
                if (!success)
                    return NotFound(new { message = "Class not found" });

                return Ok(new { message = "Student added to class successfully" });
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // DELETE: api/Classes/5/students/{studentId}
        [HttpDelete("{id:int}/students/{studentId:int}")]
        public async Task<IActionResult> RemoveStudentFromClass(int id, int studentId)
        {
            try
            {
                var success = await _classService.RemoveStudentFromClassAsync(id, studentId);
                if (!success)
                    return NotFound(new { message = "Class not found" });

                return Ok(new { message = "Student removed from class successfully" });
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }
    }
}
