using EducenAPI.DTOs;
using EducenAPI.DTOs.Tenant;
using EducenAPI.Services.TenantService;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
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
    }
}
