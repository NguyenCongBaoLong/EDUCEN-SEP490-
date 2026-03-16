using EducenAPI.DTOs.Parents;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ParentsController : ControllerBase
    {
        private readonly IParentService _parentService;

        public ParentsController(IParentService parentService)
        {
            _parentService = parentService;
        }

        // GET: api/Parents
        [HttpGet]
        public async Task<IActionResult> GetParents()
        {
            var parents = await _parentService.GetAllParentsAsync();
            return Ok(parents);
        }

        // GET: api/Parents/5
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetParent(int id)
        {
            var parent = await _parentService.GetParentByIdAsync(id);

            if (parent == null)
                return NotFound(new { message = "Parent not found" });

            return Ok(parent);
        }

        // POST: api/Parents
        [HttpPost]
        public async Task<IActionResult> CreateParent(CreateParentDto dto)
        {
            try
            {
                var parent = await _parentService.CreateParentAsync(dto);
                return CreatedAtAction(nameof(GetParent), new { id = parent.ParentId }, parent);
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT: api/Parents/5
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateParent(int id, UpdateParentDto dto)
        {
            try
            {
                var success = await _parentService.UpdateParentAsync(id, dto);
                if (!success)
                    return NotFound(new { message = "Parent not found" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // DELETE: api/Parents/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteParent(int id)
        {
            try
            {
                var success = await _parentService.DeleteParentAsync(id);
                if (!success)
                    return NotFound(new { message = "Parent not found" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
