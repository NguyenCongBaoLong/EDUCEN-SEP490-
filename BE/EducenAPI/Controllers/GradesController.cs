using EducenAPI.DTOs.Grades;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class GradesController : ControllerBase
    {
        private readonly IGradeService _gradeService;

        public GradesController(IGradeService gradeService)
        {
            _gradeService = gradeService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,TenantAdmin,Teacher,Assistant")]
        public async Task<ActionResult<IEnumerable<GradeDto>>> GetGrades()
        {
            var grades = await _gradeService.GetAllGradesAsync();
            return Ok(grades);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,TenantAdmin,Teacher,Assistant")]
        public async Task<ActionResult<GradeDto>> GetGrade(int id)
        {
            var grade = await _gradeService.GetGradeByIdAsync(id);
            if (grade == null) return NotFound();
            return Ok(grade);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<ActionResult<GradeDto>> CreateGrade(CreateGradeDto dto)
        {
            var grade = await _gradeService.CreateGradeAsync(dto);
            return CreatedAtAction(nameof(GetGrade), new { id = grade.GradeId }, grade);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> UpdateGrade(int id, UpdateGradeDto dto)
        {
            var success = await _gradeService.UpdateGradeAsync(id, dto);
            if (!success) return NotFound();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> DeleteGrade(int id)
        {
            try
            {
                var success = await _gradeService.DeleteGradeAsync(id);
                if (!success) return NotFound();
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
