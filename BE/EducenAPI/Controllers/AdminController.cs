using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using EducenAPI.Services.Interface;

namespace EducenAPI.Controllers
{
    [Route("api/admin")]
    [ApiController]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly IUserManagementService _userManagementService;

        public AdminController(IUserManagementService userManagementService)
        {
            _userManagementService = userManagementService;
        }

        // PUT: api/admin/users/{id}/lock
        [HttpPut("users/{id:int}/lock")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> LockUserAccount(int id)
        {
            try
            {
                var success = await _userManagementService.LockUserAccountAsync(id);
                if (!success)
                    return NotFound(new { message = "Không tìm thấy người dùng" });

                return Ok(new { message = "Khóa tài khoản người dùng thành công", userId = id, status = "Locked" });
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT: api/admin/users/{id}/unlock
        [HttpPut("users/{id:int}/unlock")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> UnlockUserAccount(int id)
        {
            try
            {
                var success = await _userManagementService.UnlockUserAccountAsync(id);
                if (!success)
                    return NotFound(new { message = "Không tìm thấy người dùng" });

                return Ok(new { message = "Mở khóa tài khoản người dùng thành công", userId = id, status = "Active" });
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // GET: api/admin/users
        [HttpGet("users")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _userManagementService.GetAllUsersAsync();
            return Ok(users);
        }

// GET: api/admin/users/{id}
        [HttpGet("users/{id:int}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> GetUserById(int id)
        {
            var user = await _userManagementService.GetUserByIdAsync(id);

            if (user == null)
                return NotFound(new { message = "Không tìm thấy người dùng" });

            return Ok(user);
        }
    }
}