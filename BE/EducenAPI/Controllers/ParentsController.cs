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
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> GetParents()
        {
            var parents = await _parentService.GetAllParentsAsync();
            return Ok(parents);
        }

        // GET: api/Parents/5
        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> GetParent(int id)
        {
            var parent = await _parentService.GetParentByIdAsync(id);

            if (parent == null)
                return NotFound(new { message = "Không tìm thấy phụ huynh." });

            return Ok(parent);
        }

        // POST: api/Parents
        [HttpPost]
        [Authorize(Roles = "Admin,TenantAdmin")]
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
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> UpdateParent(int id, UpdateParentDto dto)
        {
            try
            {
                var success = await _parentService.UpdateParentAsync(id, dto);
                if (!success)
                    return NotFound(new { message = "Không tìm thấy phụ huynh." });

                return NoContent();
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // DELETE: api/Parents/5
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> DeleteParent(int id)
        {
            try
            {
                var success = await _parentService.DeleteParentAsync(id);
                if (!success)
                    return NotFound(new { message = "Không tìm thấy phụ huynh." });

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("send-account/{id:int}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> SendAccount(int id)
        {
            try
            {
                var success = await _parentService.SendAccountAsync(id);
                if (!success)
                    return NotFound(new { message = "Không tìm thấy phụ huynh." });

                return Ok(new { message = "Đã gửi tài khoản thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/Parents/my-children
        [HttpGet("my-children")]
        [Authorize(Roles = "Parent")]
        public async Task<IActionResult> GetMyChildren()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return Unauthorized();
            int parentUserId = int.Parse(userIdClaim.Value);
            var children = await _parentService.GetMyChildrenAsync(parentUserId);
            return Ok(children);
        }

        // GET: api/Parents/child/{childId}/performance-report
        [HttpGet("child/{childId:int}/performance-report")]
        [Authorize(Roles = "Parent")]
        public async Task<IActionResult> GetChildPerformanceReport(int childId, [FromQuery] int? month = null, [FromQuery] int? year = null)
        {
            try
            {
                var parentUserIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
                if (parentUserIdClaim == null) return Unauthorized();
                int parentUserId = int.Parse(parentUserIdClaim.Value);

                // Verify this child belongs to the parent
                var myChildren = await _parentService.GetMyChildrenAsync(parentUserId);
                if (!myChildren.Any(c => c.StudentId == childId))
                {
                    return StatusCode(403, new { message = "Bạn không có quyền xem báo cáo của học sinh này." });
                }

                var report = await _parentService.GetChildPerformanceReportAsync(childId, month, year);
                if (report == null) return NotFound(new { message = "Không tìm thấy dữ liệu học sinh." });

                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
