using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
        public async Task<IActionResult> LockUserAccount(int id)
        {
            try
            {
                var success = await _userManagementService.LockUserAccountAsync(id);
                if (!success)
                    return NotFound(new { message = "User not found" });

                return Ok(new { message = "User account locked successfully", userId = id, status = "Locked" });
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT: api/admin/users/{id}/unlock
        [HttpPut("users/{id:int}/unlock")]
        public async Task<IActionResult> UnlockUserAccount(int id)
        {
            try
            {
                var success = await _userManagementService.UnlockUserAccountAsync(id);
                if (!success)
                    return NotFound(new { message = "User not found" });

                return Ok(new { message = "User account unlocked successfully", userId = id, status = "Active" });
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // GET: api/admin/users
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _userManagementService.GetAllUsersAsync();
            return Ok(users);
        }

        // GET: api/admin/users/{id}
        [HttpGet("users/{id:int}")]
        public async Task<IActionResult> GetUserById(int id)
        {
            var user = await _userManagementService.GetUserByIdAsync(id);

            if (user == null)
                return NotFound(new { message = "User not found" });

            return Ok(user);
        }
    }
}
