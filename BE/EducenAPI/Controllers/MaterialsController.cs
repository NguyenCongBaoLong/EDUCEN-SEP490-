using EducenAPI.DTOs.LessionMaterials;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MaterialsController : ControllerBase
    {
        private readonly ILessonMaterialService _lessonMaterialService;
        public MaterialsController(ILessonMaterialService lessonMaterialService)
        {
            _lessonMaterialService = lessonMaterialService;
        }

        [HttpPost("save")]
        public async Task<IActionResult> SaveMaterial([FromBody] SaveMaterialDto dto)
        {
            var result = await _lessonMaterialService.SaveMaterials(dto);
            return Ok(result);
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadMaterial([FromForm] UploadMaterialDto dto)
        {
            var result = await _lessonMaterialService.UploadMaterials(dto);
            return Ok(result);
        }
    }
}
