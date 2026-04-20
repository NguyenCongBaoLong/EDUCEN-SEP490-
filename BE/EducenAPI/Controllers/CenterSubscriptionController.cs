using System.ComponentModel.DataAnnotations;
using EducenAPI.DTOs.Subscription;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
using EducenAPI.Services.Interface;
using EducenAPI.Services.Payment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/admin/subscription")]
    [Authorize(Roles = "Admin")]
    public class CenterSubscriptionController : ControllerBase
    {
        private readonly ISubscriptionService _subscriptionService;
        private readonly ISubscriptionChangeService _subscriptionChangeService;
        private readonly IContractService _contractService;
        private readonly ICurrentTenantService _currentTenantService;
        private readonly AdminDbContext _adminDbContext;
        private readonly IRefundService _refundService;
        private readonly IPaymentService _paymentService;
        private readonly IEInvoiceSandboxService _eInvoiceSandboxService;

        public CenterSubscriptionController(
            ISubscriptionService subscriptionService,
            ISubscriptionChangeService subscriptionChangeService,
            IContractService contractService,
            ICurrentTenantService currentTenantService,
            AdminDbContext adminDbContext,
            IRefundService refundService,
            IPaymentService paymentService,
            IEInvoiceSandboxService eInvoiceSandboxService)
        {
            _subscriptionService = subscriptionService;
            _subscriptionChangeService = subscriptionChangeService;
            _contractService = contractService;
            _currentTenantService = currentTenantService;
            _adminDbContext = adminDbContext;
            _refundService = refundService;
            _paymentService = paymentService;
            _eInvoiceSandboxService = eInvoiceSandboxService;
        }

        private string GetTenantId()
        {
            var currentTenant = _currentTenantService.TenantId;
            var claimTenant = User.Claims.FirstOrDefault(c => c.Type == "TenantId")?.Value;
            
            Console.WriteLine($"[DEBUG] CurrentTenantService.TenantId: {currentTenant}");
            Console.WriteLine($"[DEBUG] User.Claims TenantId: {claimTenant}");
            Console.WriteLine($"[DEBUG] User.Identity.IsAuthenticated: {User.Identity.IsAuthenticated}");
            
            return currentTenant ?? claimTenant;
        }

        [HttpGet("current")]
        public async Task<IActionResult> GetCurrentSubscription()
        {
            var tenantId = GetTenantId();

            Console.WriteLine($"[GetCurrentSubscription] tenantId: {tenantId}");

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            var subscription = await _subscriptionService.GetActiveSubscriptionAsync(tenantId);

            Console.WriteLine($"[GetCurrentSubscription] subscription: {subscription?.PlanName}");

            return Ok(subscription);
        }

        /// <summary>
        /// Đổi gói dịch vụ (upgrade/downgrade)
        /// </summary>
        [HttpPost("change-plan")]
        public IActionResult ChangePlan([FromBody] ChangePlanRequestDTO request)
        {
            return BadRequest(new
            {
                message = "Da ngung luong doi goi truc tiep. Vui long gui yeu cau doi goi de SystemAdmin duyet va thanh toan hoa don."
            });
        }

        /// <summary>
        /// Lấy số dư credit của center hiện tại
        /// </summary>
        [HttpGet("credit-balance")]
        public async Task<IActionResult> GetCreditBalance()
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            var tenant = await _adminDbContext.Tenants.FindAsync(tenantId);
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

        /// <summary>
        /// Lấy lịch sử credit của center hiện tại
        /// </summary>
        [HttpGet("credit-ledger")]
        public async Task<IActionResult> GetCreditLedger([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            var ledger = await _adminDbContext.TenantCreditLedgers
                .Where(l => l.TenantId == tenantId)
                .OrderByDescending(l => l.CreatedAt)
                .ThenByDescending(l => l.LedgerId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(ledger);
        }

        /// <summary>
        /// Hủy gói dịch vụ - effective end of period (không refund)
        /// </summary>
        [HttpPost("cancel")]
        public async Task<IActionResult> CancelSubscription([FromBody] CancelSubscriptionRequest request)
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            try
            {
                // immediate = false → hủy cuối kỳ, không refund
                // immediate = true → hủy ngay, tạo credit hoàn lại
                var result = await _subscriptionService.CancelSubscription(
                    tenantId, 
                    request.Immediate,
                    request.Immediate); // createCredit = immediate

                if (!result)
                    return BadRequest(new { message = "Không tìm thấy gói dịch vụ đang hoạt động." });

                return Ok(new
                {
                    message = request.Immediate 
                        ? "Đã hủy gói dịch vụ ngay lập tức. Credit đã được hoàn lại vào tài khoản."
                        : "Đã hủy gói dịch vụ. Sẽ hết hiệu lực khi hết kỳ thanh toán.",
                    cancelledAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Tính toán số tiền hoàn lại khi hủy gói
        /// </summary>
        [HttpGet("estimate-refund")]
        public async Task<IActionResult> EstimateRefund()
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            try
            {
                var subscription = await _subscriptionService.GetActiveSubscriptionAsync(tenantId);
                if (subscription == null)
                    return BadRequest(new { message = "Không tìm thấy gói dịch vụ đang hoạt động." });

                // Get the subscription entity to calculate refund
                var subEntity = await _adminDbContext.Subscriptions
                    .Include(s => s.Plan)
                    .FirstOrDefaultAsync(s => s.Id == subscription.SubscriptionId && s.TenantId == tenantId);

                if (subEntity == null)
                    return BadRequest(new { message = "Không tìm thấy gói dịch vụ." });

                var unusedCredit = _subscriptionService.CalculateUnusedCredit(subEntity);

                // Kiểm tra grace period
                var daysSinceStart = (DateTime.UtcNow - subEntity.StartDate).Days;
                const int GRACE_PERIOD_DAYS = 7;
                var withinGracePeriod = daysSinceStart <= GRACE_PERIOD_DAYS;

                return Ok(new
                {
                    subscriptionId = subscription.SubscriptionId,
                    planName = subscription.PlanName,
                    planPrice = subscription.PlanPrice,
                    startDate = subscription.StartDate,
                    endDate = subscription.EndDate,
                    daysRemaining = Math.Max(0, (subEntity.EndDate - DateTime.UtcNow).Days),
                    withinGracePeriod = withinGracePeriod,
                    gracePeriodDaysRemaining = Math.Max(0, GRACE_PERIOD_DAYS - daysSinceStart),
                    estimatedRefundAmount = unusedCredit,
                    canRequestRefund = withinGracePeriod,
                    message = withinGracePeriod 
                        ? $"Có thể hoàn tiền trong {GRACE_PERIOD_DAYS - daysSinceStart} ngày grace period còn lại."
                        : "Ngoài grace period - không thể yêu cầu hoàn tiền."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Yêu cầu hủy gói và hoàn tiền (refund to credit)
        /// </summary>
        [HttpPost("request-cancel-refund")]
        public async Task<IActionResult> RequestCancelWithRefund([FromBody] RequestCancelRefundRequest request)
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            try
            {
                var subscription = await _subscriptionService.GetActiveSubscriptionAsync(tenantId);
                if (subscription == null)
                    return BadRequest(new { message = "Không tìm thấy gói dịch vụ đang hoạt động." });

                // Get the subscription entity
                var subEntity = await _adminDbContext.Subscriptions
                    .Include(s => s.Plan)
                    .FirstOrDefaultAsync(s => s.Id == subscription.SubscriptionId && s.TenantId == tenantId);

                if (subEntity == null)
                    return BadRequest(new { message = "Không tìm thấy gói dịch vụ." });

                // Check grace period
                var daysSinceStart = (DateTime.UtcNow - subEntity.StartDate).Days;
                const int GRACE_PERIOD_DAYS = 7;

                if (daysSinceStart > GRACE_PERIOD_DAYS)
                    return BadRequest(new { message = "Chỉ được hoàn tiền trong 7 ngày grace period đầu tiên." });

                var unusedCredit = _subscriptionService.CalculateUnusedCredit(subEntity);
                if (unusedCredit <= 0)
                    return BadRequest(new { message = "Gói dịch vụ không còn giá trị hoàn lại." });

                // Find the payment record for this subscription
                var payment = await _adminDbContext.PaymentRecords
                    .Where(p => p.TenantId == tenantId 
                        && p.ReferenceId == subscription.SubscriptionId 
                        && p.Status == "Paid"
                        && p.TransactionType == "Subscription")
                    .OrderByDescending(p => p.PaymentDate)
                    .FirstOrDefaultAsync();

                if (payment == null)
                    return BadRequest(new { message = "Không tìm thấy giao dịch thanh toán." });

                // Check if refund already exists
                var existingRefund = await _adminDbContext.RefundRequests
                    .FirstOrDefaultAsync(r => r.PaymentRecordId == payment.PaymentId &&
                        (r.Status == "Pending" || r.Status == "Approved" || r.Status == "Processing" || r.Status == "Completed"));

                if (existingRefund != null)
                    return BadRequest(new { message = "Đã tồn tại yêu cầu hoàn tiền cho gói dịch vụ này." });

                // Create refund request (refund to credit only)
                var refundRequest = new EducenAPI.Services.Interface.CreateRefundRequest
                {
                    PaymentRecordId = payment.PaymentId,
                    TenantId = tenantId,
                    SubscriptionId = subscription.SubscriptionId,
                    RequestedBy = int.TryParse(User.FindFirst("UserId")?.Value, out var userId) ? userId : 0,
                    Reason = $"Hủy gói dịch vụ: {request.Reason}",
                    RefundAmount = unusedCredit,
                    RefundMethod = "Credit",
                    IsServiceIssue = false
                };

                var refund = await _refundService.CreateRefundRequestAsync(refundRequest);

                return Ok(new
                {
                    refundId = refund.RefundId,
                    message = "Yêu cầu hủy gói và hoàn tiền đã được gửi. Vui lòng chờ admin xử lý.",
                    estimatedRefundAmount = unusedCredit,
                    status = refund.Status
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Gia hạn/gói mở rộng (extend/renew với nhiều tháng hơn)
        /// </summary>
        [HttpPost("extend")]
        public IActionResult ExtendSubscription([FromBody] ExtendSubscriptionRequest request)
        {
            return BadRequest(new
            {
                message = "Da ngung luong gia han truc tiep. Vui long gui yeu cau doi goi voi cung goi hien tai de gia han va cho SystemAdmin duyet."
            });
        }


        /// <summary>
        /// Xác nhận gia hạn và thanh toán (sau khi thanh toán VNPay thành công)
        /// </summary>
        [HttpPost("extend-confirm")]
        public IActionResult ConfirmExtend([FromBody] ExtendConfirmRequest request)
        {
            return BadRequest(new
            {
                message = "Da ngung luong xac nhan gia han truc tiep. Vui long thanh toan hoa don tu luong yeu cau doi goi."
            });
        }

        /// <summary>
        /// Yêu cầu đổi gói dịch vụ (luồng mới)
        /// </summary>
        [HttpPost("request-change")]
        public async Task<IActionResult> RequestChangePackage([FromBody] CreateSubscriptionChangeRequestDto dto)
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            try
            {
                var username = User.Identity?.Name ?? "CenterAdmin";
                var result = await _subscriptionChangeService.CreatePackageChangeRequestAsync(tenantId, dto.RequestedPlanId, dto.Months, dto.Reason, username);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xem yêu cầu đổi gói của mình
        /// </summary>
        [HttpGet("my-change-requests")]
        public async Task<IActionResult> GetMyChangeRequests()
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            try
            {
                var requests = await _subscriptionChangeService.GetTenantPackageChangeRequestsAsync(tenantId);
                return Ok(requests);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xem hoá đơn của center
        /// </summary>
        [HttpGet("invoices")]
        public async Task<IActionResult> GetMyInvoices()
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

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
        /// Center gửi yêu cầu xác nhận thanh toán offline cho hoá đơn đổi gói
        /// </summary>
        [HttpPost("invoices/{invoiceId}/request-offline-payment")]
        public async Task<IActionResult> RequestOfflinePayment(string invoiceId, [FromBody] RequestOfflineInvoicePaymentDto dto)
        {
            var tenantId = GetTenantId();
            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            try
            {
                var requestedBy = User.Identity?.Name ?? "CenterAdmin";
                var invoice = await _subscriptionChangeService.RequestOfflineInvoicePaymentAsync(
                    tenantId,
                    invoiceId,
                    dto.PaymentMethod,
                    dto.PaymentNote,
                    requestedBy);
                return Ok(invoice);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Center tạo giao dịch VNPay cho hoá đơn đổi gói
        /// </summary>
        [HttpPost("invoices/{invoiceId}/create-vnpay-payment")]
        public async Task<IActionResult> CreateInvoiceVnPayPayment(string invoiceId, [FromBody] CreateInvoiceVnPayPaymentDto dto)
        {
            var tenantId = GetTenantId();
            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            var invoice = await _adminDbContext.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId && i.TenantId == tenantId);

            if (invoice == null)
                return NotFound(new { message = "Không tìm thấy hoá đơn." });

            if (invoice.Status == "Paid")
                return BadRequest(new { message = "Hoá đơn đã thanh toán." });

            if (invoice.Status == "Cancelled")
                return BadRequest(new { message = "Hoá đơn đã bị huỷ." });

            var paymentResult = await _paymentService.CreatePaymentAsync(new CreatePaymentDto
            {
                TenantId = tenantId,
                Amount = invoice.Amount,
                GatewayType = "VNPay",
                TransactionType = "SubscriptionInvoice",
                ReferenceId = invoice.InvoiceId,
                Description = $"Thanh toán hoá đơn {invoice.InvoiceNumber}",
                ReturnUrl = dto.ReturnUrl,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
                CustomerName = User.Identity?.Name,
                PaidBy = User.Identity?.Name
            });

            if (!paymentResult.Success)
                return BadRequest(new { message = paymentResult.ErrorMessage ?? "Không thể tạo thanh toán VNPay." });

            return Ok(paymentResult);
        }

        /// <summary>
        /// Lịch sử giao dịch online (VNPay) của center cho hoá đơn đổi gói
        /// </summary>
        [HttpGet("payment-history")]
        public async Task<IActionResult> GetPaymentHistory()
        {
            var tenantId = GetTenantId();
            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            var records = await _adminDbContext.PaymentRecords
                .Where(p => p.TenantId == tenantId
                    && p.TransactionType == "SubscriptionInvoice"
                    && p.PaymentMethod == "VNPay")
                .OrderByDescending(p => p.PaymentDate)
                .Select(p => new
                {
                    p.PaymentId,
                    p.Amount,
                    p.Status,
                    p.PaymentDate,
                    p.Description,
                    p.ReferenceId,
                    p.TransactionType
                })
                .ToListAsync();

            return Ok(records);
        }

        /// <summary>
        /// Phat hanh hoa don dien tu sandbox (demo) cho hoa don doi goi da thanh toan
        /// </summary>
        [HttpPost("invoices/{invoiceId}/einvoice/issue")]
        public async Task<IActionResult> IssueSandboxEInvoice(string invoiceId)
        {
            var tenantId = GetTenantId();
            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            var invoice = await _adminDbContext.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId && i.TenantId == tenantId);

            if (invoice == null)
                return NotFound(new { message = "Không tìm thấy hoá đơn." });

            if (!string.Equals(invoice.Status, "Paid", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Chỉ phát hành HĐĐT sandbox cho hoá đơn đã thanh toán." });

            var tenant = await _adminDbContext.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TenantId == tenantId);

            var tenantName = tenant?.TenantName ?? "Center";
            var meta = _eInvoiceSandboxService.BuildMetadata(invoice, tenantName);

            return Ok(new
            {
                provider = meta.Provider,
                invoiceNo = meta.InvoiceNo,
                lookupCode = meta.LookupCode,
                issuedAt = meta.IssuedAt,
                xmlDownloadUrl = $"/api/admin/subscription/invoices/{invoiceId}/einvoice/xml",
                representationDownloadUrl = $"/api/admin/subscription/invoices/{invoiceId}/einvoice/representation"
            });
        }

        /// <summary>
        /// Tai file XML hoa don dien tu sandbox
        /// </summary>
        [HttpGet("invoices/{invoiceId}/einvoice/xml")]
        public async Task<IActionResult> DownloadSandboxEInvoiceXml(string invoiceId)
        {
            var tenantId = GetTenantId();
            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            var invoice = await _adminDbContext.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId && i.TenantId == tenantId);

            if (invoice == null)
                return NotFound(new { message = "Không tìm thấy hoá đơn." });

            if (!string.Equals(invoice.Status, "Paid", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Chỉ tải XML cho hoá đơn đã thanh toán." });

            var tenant = await _adminDbContext.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TenantId == tenantId);
            var tenantName = tenant?.TenantName ?? "Center";
            var meta = _eInvoiceSandboxService.BuildMetadata(invoice, tenantName);
            var xml = _eInvoiceSandboxService.BuildXml(invoice, tenantName, meta);
            var bytes = System.Text.Encoding.UTF8.GetBytes(xml);

            var fileName = $"{meta.InvoiceNo}.xml";
            return File(bytes, "application/xml; charset=utf-8", fileName);
        }

        /// <summary>
        /// Tai ban the hien hoa don dien tu sandbox (HTML)
        /// </summary>
        [HttpGet("invoices/{invoiceId}/einvoice/representation")]
        public async Task<IActionResult> DownloadSandboxEInvoiceRepresentation(string invoiceId)
        {
            var tenantId = GetTenantId();
            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

            var invoice = await _adminDbContext.Invoices
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId && i.TenantId == tenantId);

            if (invoice == null)
                return NotFound(new { message = "Không tìm thấy hoá đơn." });

            if (!string.Equals(invoice.Status, "Paid", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Chỉ tải bản thể hiện cho hoá đơn đã thanh toán." });

            var tenant = await _adminDbContext.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TenantId == tenantId);
            var tenantName = tenant?.TenantName ?? "Center";
            var meta = _eInvoiceSandboxService.BuildMetadata(invoice, tenantName);
            var html = _eInvoiceSandboxService.BuildHtmlRepresentation(invoice, tenantName, meta);
            var bytes = System.Text.Encoding.UTF8.GetBytes(html);

            var fileName = $"{meta.InvoiceNo}.html";
            return File(bytes, "text/html; charset=utf-8", fileName);
        }

        /// <summary>
        /// Xem hợp đồng của center
        /// </summary>
        [HttpGet("contracts")]
        public async Task<IActionResult> GetMyContracts()
        {
            var tenantId = GetTenantId();

            if (string.IsNullOrWhiteSpace(tenantId))
                return BadRequest(new { message = "Không xác định được trung tâm." });

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
        /// Download/Tải file hợp đồng
        /// </summary>
        [HttpGet("contracts/{contractId}/download")]
        [AllowAnonymous]
        public async Task<IActionResult> DownloadContract(string contractId)
        {
            try
            {
                var contract = await _contractService.GetContractByIdAsync(contractId);
                if (contract == null)
                    return NotFound(new { message = "Không tìm thấy hợp đồng" });

                var webRoot = Directory.GetCurrentDirectory();
                
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
                    if (System.IO.File.Exists(p))
                    {
                        foundPath = p;
                        break;
                    }
                }

                if (foundPath == null)
                    return NotFound(new { message = "File không tồn tại" });

                var fileBytes = await System.IO.File.ReadAllBytesAsync(foundPath);
                var contentType = contract.FileType.ToLower() switch
                {
                    "pdf" => "application/pdf",
                    "jpg" => "image/jpeg",
                    "jpeg" => "image/jpeg",
                    "png" => "image/png",
                    _ => "application/octet-stream"
                };

                return File(fileBytes, contentType, contract.ContractTitle + "." + contract.FileType.ToLower());
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class ExtendConfirmRequest
    {
        public int Months { get; set; }
        public string? PaymentRecordId { get; set; }
    }

    /// <summary>
    /// Request model cho hủy subscription
    /// </summary>
    public class CancelSubscriptionRequest
    {
        /// <summary>
        /// Hủy ngay lập tức (true) hay cuối kỳ (false)
        /// </summary>
        public bool Immediate { get; set; } = false;
    }

    /// <summary>
    /// Request model cho yêu cầu hủy + refund
    /// </summary>
    public class RequestCancelRefundRequest
    {
        /// <summary>
        /// Lý do hủy gói
        /// </summary>
        public string Reason { get; set; } = "Yêu cầu hủy gói dịch vụ";
    }

    /// <summary>
    /// Request model cho gia hạn/mở rộng gói
    /// </summary>
    public class ExtendSubscriptionRequest
    {
        /// <summary>
        /// Số tháng muốn gia hạn
        /// </summary>
        [Range(1, 120, ErrorMessage = "Số tháng phải từ 1 đến 120")]
        public int Months { get; set; }
    }

    public class RequestOfflineInvoicePaymentDto
    {
        public string PaymentMethod { get; set; } = "Cash"; // Cash
        public string? PaymentNote { get; set; }
    }

    public class CreateInvoiceVnPayPaymentDto
    {
        public string ReturnUrl { get; set; } = string.Empty;
    }
}



