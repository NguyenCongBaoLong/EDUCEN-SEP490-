using EducenAPI.DTOs.LessionMaterials;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MaterialsController : ControllerBase
    {
        private readonly ILessonMaterialService _lessonMaterialService;
        public MaterialsController(ILessonMaterialService lessonMaterialService)
        {
            _lessonMaterialService = lessonMaterialService;
        }

        [HttpPost("save")]
        [Authorize(Roles = "Teacher,Assistant,Admin")]
        public async Task<IActionResult> SaveMaterials([FromForm] SaveMaterialDto dto)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = await _lessonMaterialService.SaveMaterials(dto, baseUrl);
            return Ok(result);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Teacher,Assistant,Admin")]
        public async Task<IActionResult> UpdateMaterial(int id, [FromForm] SaveMaterialDto dto)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = await _lessonMaterialService.UpdateMaterialAsync(id, dto, baseUrl);
            return Ok(result);
        }

        [HttpPost("upload")]
        [RequestSizeLimit(10 * 1024 * 1024)]
        [Authorize(Roles = "Teacher,Assistant,Admin")]
        public async Task<IActionResult> UploadMaterial([FromForm] UploadMaterialDto dto)
        {
            var result = await _lessonMaterialService.UploadMaterials(dto);
            return StatusCode(StatusCodes.Status201Created, result);
        }
        [HttpGet]
        [Authorize(Roles = "Teacher,Assistant,Admin,Student")]
        public async Task<IActionResult> GetMaterials()
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = await _lessonMaterialService.GetAllMaterialsAsync(baseUrl);
            return Ok(result);
        }

        [HttpGet("Get-By-Session/{sessionId}")]
        [Authorize(Roles = "Teacher,Assistant,Admin,Student")]
        public async Task<IActionResult> GetBySession(int sessionId)
        {
            
            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            var result = await _lessonMaterialService.GetMaterialsBySessionAsync(sessionId, baseUrl);

            if (result == null || result.Count == 0)
            {
                return Ok(new List<MaterialResponseDto>());
            }

            return Ok(result);
        }

        [HttpPost("import")]
        [Authorize(Roles = "Teacher,Assistant,Admin")]
        public async Task<IActionResult> ImportMaterial([FromBody] EducenAPI.DTOs.Common.ImportDto dto)
        {
            var result = await _lessonMaterialService.ImportMaterialAsync(dto.SourceId, dto.TargetSessionId);
            return Ok(result);
        }
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Teacher,Assistant,Admin")]
        public async Task<IActionResult> DeleteMaterial(int id)
        {
            var success = await _lessonMaterialService.DeleteMaterialAsync(id);
            if (!success) return NotFound();
            return NoContent();
        }
    }
}
