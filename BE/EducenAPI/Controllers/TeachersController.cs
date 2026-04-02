using EducenAPI.DTOs.Teachers;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TeachersController : ControllerBase
    {
        private readonly ITeacherService _teacherService;

        public TeachersController(ITeacherService teacherService)
        {
            _teacherService = teacherService;
        }

        // GET: api/Teachers
        [HttpGet]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> GetTeachers()
        {
            var teachers = await _teacherService.GetAllTeachersAsync();
            return Ok(teachers);
        }

        // GET: api/Teachers/5
        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin,TenantAdmin,Teacher")]
        public async Task<IActionResult> GetTeacher(int id)
        {
            var teacher = await _teacherService.GetTeacherByIdAsync(id);

            if (teacher == null)
                return NotFound(new { message = "Không tìm thấy giáo viên." });

            return Ok(teacher);
        }

        // POST: api/Teachers
        [HttpPost]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> CreateTeacher(CreateTeacherDto dto)
        {
            try
            {
                var teacher = await _teacherService.CreateTeacherAsync(dto);
                return CreatedAtAction(nameof(GetTeacher), new { id = teacher.TeacherId }, teacher);
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT: api/Teachers/5
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> UpdateTeacher(int id, UpdateTeacherDto dto)
        {
            try
            {
                var success = await _teacherService.UpdateTeacherAsync(id, dto);
                if (!success)
                    return NotFound(new { message = "Không tìm thấy giáo viên." });

                return NoContent();
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // DELETE: api/Teachers/5
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> DeleteTeacher(int id)
        {
            try
            {
                var success = await _teacherService.DeleteTeacherAsync(id);
                if (!success)
                    return NotFound(new { message = "Không tìm thấy giáo viên." });

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/Teachers/5/classes
        [HttpGet("{id:int}/classes")]
        [Authorize(Roles = "Admin,TenantAdmin,Teacher")]
        public async Task<IActionResult> GetTeacherClasses(int id)
        {
            var classes = await _teacherService.GetTeacherClassesAsync(id);
            return Ok(classes);
        }

        // POST: api/Teachers/send-account/5
        [HttpPost("send-account/{id:int}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> SendAccount(int id)
        {
            try
            {
                await _teacherService.SendAccountAsync(id);
                return Ok(new { message = "Đã gửi tài khoản giáo viên qua email." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
