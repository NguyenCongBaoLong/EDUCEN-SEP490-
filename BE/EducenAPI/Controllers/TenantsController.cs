using EducenAPI.DTOs;
using EducenAPI.DTOs.Tenant;
using EducenAPI.Services.TenantService;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/admin/[controller]")]
    [ApiController]
    [Authorize(Roles = "SystemAdmin")]
    public class TenantsController : ControllerBase
    {
        private readonly ITenantService _tenantService;

        public TenantsController(ITenantService tenantService)
        {
            _tenantService = tenantService;
        }

        // Create a new tenant
        [HttpPost]
        public IActionResult Post(CreateTenantRequest request)
        {
            var result = _tenantService.CreateTenant(request);
            return Ok(result);
        }

        [HttpGet]
        public IActionResult GetAll()
        {
            var tenants = _tenantService.GetAllTenantDetails();
            return Ok(tenants);
        }


        [HttpGet("{tenantId}/details")]
        public IActionResult GetTenantDetails(string tenantId)
        {
            var tenant = _tenantService.GetTenantDetails(tenantId);

            if (tenant == null)
                return NotFound();

            return Ok(tenant);
        }

        [HttpPut("{tenantId}")]
        public IActionResult Update(string tenantId, UpdateTenantRequest request)
        {
            var updatedTenant = _tenantService.UpdateTenant(tenantId, request);

            if (updatedTenant == null)
                return NotFound();

            return Ok(updatedTenant);
        }

        // Tạo admin cho tenant
        [HttpPost("{tenantId}/admin")]
        public async Task<IActionResult> CreateAdmin(string tenantId, CreateTenantAdminDto dto)
        {
            try
            {
                var result = await _tenantService.CreateAdminForTenantAsync(tenantId, dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Lấy danh sách admin của tenant
        [HttpGet("{tenantId}/admins")]
        public async Task<IActionResult> GetAdmins(string tenantId)
        {
            try
            {
                var admins = await _tenantService.GetTenantAdminsAsync(tenantId);
                return Ok(admins);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
