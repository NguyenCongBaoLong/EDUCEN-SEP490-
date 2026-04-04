using EducenAPI.DTOs;
using EducenAPI.DTOs.Tenant;
using EducenAPI.Services.TenantService;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

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
        public async Task<IActionResult> Post(CreateTenantRequest request)
        {
            try
            {
                var result = await _tenantService.CreateTenant(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
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
            try
            {
                var updatedTenant = _tenantService.UpdateTenant(tenantId, request);

                if (updatedTenant == null)
                    return NotFound();

                return Ok(updatedTenant);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
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

        /// <summary>
        /// Lấy số dư credit của tenant
        /// </summary>
        [HttpGet("{tenantId}/credit-balance")]
        public async Task<IActionResult> GetCreditBalance(string tenantId)
        {
            try
            {
                var tenant = await _tenantService.GetTenantByIdAsync(tenantId);
                if (tenant == null)
                    return NotFound(new { message = "Không tìm thấy trung tâm" });

                return Ok(new
                {
                    tenantId = tenant.TenantId,
                    tenantName = tenant.TenantName,
                    creditBalance = tenant.CreditBalance,
                    updatedAt = tenant.UpdatedAt
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy lịch sử credit của tenant
        /// </summary>
        [HttpGet("{tenantId}/credit-ledger")]
        public async Task<IActionResult> GetCreditLedger(string tenantId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var tenant = await _tenantService.GetTenantByIdAsync(tenantId);
                if (tenant == null)
                    return NotFound(new { message = "Không tìm thấy trung tâm" });

                var ledger = await _tenantService.GetCreditLedgerAsync(tenantId, page, pageSize);
                return Ok(ledger);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
