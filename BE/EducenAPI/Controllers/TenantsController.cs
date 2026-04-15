using EducenAPI.DTOs;
using EducenAPI.DTOs.Tenant;
using EducenAPI.DTOs.Subscription;
using EducenAPI.Services.TenantService;
using EducenAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Threading.Tasks;

namespace EducenAPI.Controllers
{
    [Route("api/admin/[controller]")]
    [ApiController]
    [Authorize(Roles = "SystemAdmin")]
    public class TenantsController : ControllerBase
    {
        private readonly ITenantService _tenantService;
        private readonly IContractService _contractService;
        private readonly ISubscriptionChangeService _subscriptionChangeService;
        private readonly IConfiguration _configuration;

        public TenantsController(
            ITenantService tenantService,
            IContractService contractService,
            ISubscriptionChangeService subscriptionChangeService,
            IConfiguration configuration)
        {
            _tenantService = tenantService;
            _contractService = contractService;
            _subscriptionChangeService = subscriptionChangeService;
            _configuration = configuration;
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

        /// <summary>
        /// Cấu hình hạn thanh toán hóa đơn đổi gói (default)
        /// </summary>
        [HttpGet("subscription-invoice-settings")]
        public IActionResult GetSubscriptionInvoiceSettings()
        {
            var defaultDueDays = _configuration.GetValue<int?>("SubscriptionInvoices:DefaultDueDays") ?? 7;
            if (defaultDueDays < 1) defaultDueDays = 1;
            if (defaultDueDays > 60) defaultDueDays = 60;

            return Ok(new
            {
                defaultDueDays,
                minDueDays = 1,
                maxDueDays = 60
            });
        }

        /// <summary>
        /// Điều chỉnh credit thủ công (+/-) cho tenant
        /// </summary>
        [HttpPost("{tenantId}/credit-adjustment")]
        public async Task<IActionResult> AdjustCredit(string tenantId, [FromBody] AdjustCreditDto dto)
        {
            try
            {
                if (dto == null)
                    return BadRequest(new { message = "Dữ liệu không hợp lệ." });

                if (dto.Amount == 0)
                    return BadRequest(new { message = "Số tiền điều chỉnh phải khác 0." });

                var ledger = await _tenantService.AdjustTenantCreditAsync(
                    tenantId,
                    dto.Amount,
                    dto.Note ?? "Điều chỉnh credit thủ công bởi SystemAdmin",
                    dto.ReferenceType ?? "ManualAdjustment",
                    dto.ReferenceId);

                return Ok(ledger);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Thiết lập trực tiếp số dư credit của tenant
        /// </summary>
        [HttpPost("{tenantId}/credit-set-balance")]
        public async Task<IActionResult> SetCreditBalance(string tenantId, [FromBody] SetCreditBalanceDto dto)
        {
            try
            {
                if (dto == null)
                    return BadRequest(new { message = "Dữ liệu không hợp lệ." });

                if (dto.NewBalance < 0)
                    return BadRequest(new { message = "Số dư credit không thể âm." });

                var ledger = await _tenantService.SetTenantCreditBalanceAsync(
                    tenantId,
                    dto.NewBalance,
                    dto.Note ?? "Thiết lập số dư credit bởi SystemAdmin",
                    dto.ReferenceId);

                return Ok(ledger);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Upload hợp đồng cho tenant
        /// </summary>
        [HttpPost("{tenantId}/contract")]
        [Consumes("multipart/form-data")]
        [ApiExplorerSettings(IgnoreApi = true)]
        public async Task<IActionResult> UploadContract(string tenantId, [FromForm] IFormFile file, [FromForm] string title, [FromForm] string? description)
        {
            try
            {
                var contract = await _contractService.UploadContractAsync(tenantId, file, title, description, "SystemAdmin");
                return Ok(contract);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách hợp đồng của tenant
        /// </summary>
        [HttpGet("{tenantId}/contracts")]
        public async Task<IActionResult> GetContracts(string tenantId)
        {
            try
            {
                var contracts = await _contractService.GetContractsByTenantAsync(tenantId);
                return Ok(contracts);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xem chi tiết hợp đồng
        /// </summary>
        [HttpGet("contracts/{contractId}")]
        public async Task<IActionResult> GetContract(string contractId)
        {
            try
            {
                var contract = await _contractService.GetContractByIdAsync(contractId);
                if (contract == null)
                    return NotFound(new { message = "Không tìm thấy hợp đồng" });
                return Ok(contract);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xóa hợp đồng
        /// </summary>
        [HttpDelete("contracts/{contractId}")]
        public async Task<IActionResult> DeleteContract(string contractId)
        {
            try
            {
                var result = await _contractService.DeleteContractAsync(contractId);
                if (!result)
                    return NotFound(new { message = "Không tìm thấy hợp đồng" });
                return Ok(new { message = "Xóa hợp đồng thành công" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách yêu cầu đổi gói
        /// </summary>
        [HttpGet("subscription-change-requests")]
        public async Task<IActionResult> GetAllSubscriptionChangeRequests([FromQuery] string? status = null)
        {
            try
            {
                var requests = await _subscriptionChangeService.GetAllPackageChangeRequestsAsync(status);
                return Ok(requests);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Duyệt/Từ chối yêu cầu đổi gói
        /// </summary>
        [HttpPut("subscription-change-requests/{requestId}/review")]
        public async Task<IActionResult> ReviewSubscriptionChangeRequest(string requestId, [FromBody] ReviewSubscriptionChangeRequestDto dto)
        {
            try
            {
                var request = await _subscriptionChangeService.ReviewPackageChangeRequestAsync(requestId, dto.Approved, dto.ReviewNote, "SystemAdmin");
                return Ok(request);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Tạo hoá đơn cho yêu cầu đổi gói đã duyệt
        /// </summary>
        [HttpPost("subscription-change-requests/{requestId}/invoice")]
        public async Task<IActionResult> CreateInvoice(string requestId, [FromBody] CreateInvoiceDto dto)
        {
            try
            {
                var invoice = await _subscriptionChangeService.CreateInvoiceAsync(requestId, dto.DueDays, "SystemAdmin");
                return Ok(invoice);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách hoá đơn của tenant
        /// </summary>
        [HttpGet("{tenantId}/invoices")]
        public async Task<IActionResult> GetInvoices(string tenantId)
        {
            try
            {
                var invoices = await _subscriptionChangeService.GetInvoicesByTenantAsync(tenantId);
                return Ok(invoices);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lịch sử gửi hoá đơn đổi gói (toàn hệ thống hoặc theo tenant/status)
        /// </summary>
        [HttpGet("invoices-history")]
        public async Task<IActionResult> GetInvoicesHistory([FromQuery] string? tenantId = null, [FromQuery] string? status = null)
        {
            try
            {
                var invoices = await _subscriptionChangeService.GetAllInvoicesAsync(tenantId, status);
                return Ok(invoices);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Cập nhật trạng thái thanh toán hoá đơn
        /// </summary>
        [HttpPut("invoices/{invoiceId}/payment")]
        public async Task<IActionResult> UpdateInvoicePayment(string invoiceId, [FromBody] UpdatePaymentDto dto)
        {
            try
            {
                var invoice = await _subscriptionChangeService.UpdateInvoicePaymentAsync(invoiceId, dto.PaymentMethod, dto.PaymentNote, "SystemAdmin");
                return Ok(invoice);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Download/Tải file hợp đồng
        /// </summary>
        [HttpGet("contracts/{contractId}/download")]
        [AllowAnonymous]
        public async Task<IActionResult> DownloadContract(string contractId)
        {
            try
            {
                Console.WriteLine($"[Download] START - contractId: {contractId}");
                
                var contract = await _contractService.GetContractByIdAsync(contractId);
                if (contract == null)
                {
                    Console.WriteLine($"[Download] Contract not found: {contractId}");
                    return NotFound(new { message = "Không tìm thấy hợp đồng" });
                }

                Console.WriteLine($"[Download] Contract: {contract.ContractTitle}, FilePath: {contract.FilePath}");

                var webRoot = Directory.GetCurrentDirectory();
                
                // Try multiple path variations
                var possiblePaths = new[]
                {
                    Path.Combine(webRoot, contract.FilePath),
                    Path.Combine(webRoot, "wwwroot", contract.FilePath),
                    Path.Combine(webRoot, contract.FilePath.Replace("/", Path.DirectorySeparatorChar.ToString())),
                    Path.Combine(webRoot, "wwwroot", contract.FilePath.Replace("/", Path.DirectorySeparatorChar.ToString())),
                };
                
                string? foundPath = null;
                foreach (var p in possiblePaths)
                {
                    Console.WriteLine($"[Download] Checking: {p}, Exists: {System.IO.File.Exists(p)}");
                    if (System.IO.File.Exists(p))
                    {
                        foundPath = p;
                        break;
                    }
                }

                if (foundPath == null)
                    return NotFound(new { message = "File không tồn tại. Đường dẫn: " + string.Join("; ", possiblePaths) });

                var fileBytes = await System.IO.File.ReadAllBytesAsync(foundPath);
                var contentType = contract.FileType.ToLower() switch
                {
                    "pdf" => "application/pdf",
                    "jpg" => "image/jpeg",
                    "jpeg" => "image/jpeg",
                    "png" => "image/png",
                    _ => "application/octet-stream"
                };

                Console.WriteLine($"[Download] SUCCESS - returning file");
                return File(fileBytes, contentType, contract.ContractTitle + "." + contract.FileType.ToLower());
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Download] Error: {ex.Message}");
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class AdjustCreditDto
    {
        public decimal Amount { get; set; }
        public string? Note { get; set; }
        public string? ReferenceType { get; set; }
        public string? ReferenceId { get; set; }
    }

    public class SetCreditBalanceDto
    {
        public decimal NewBalance { get; set; }
        public string? Note { get; set; }
        public string? ReferenceId { get; set; }
    }
}
