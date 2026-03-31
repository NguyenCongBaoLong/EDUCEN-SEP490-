using EducenAPI.Services.Interface;
using EducenAPI.Services.Payment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly ILogger<PaymentsController> _logger;
        private readonly IConfiguration _configuration;

        public PaymentsController(IPaymentService paymentService, ILogger<PaymentsController> logger, IConfiguration configuration)
        {
            _paymentService = paymentService;
            _logger = logger;
            _configuration = configuration;
        }

        /// <summary>
        /// Tạo thanh toán mới
        /// </summary>
        [HttpPost("create")]
        [Authorize(Roles = "Admin,Student,Parent")]
        public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentApiRequest request)
        {
            try
            {
                var ipAddress = GetClientIpAddress();

                var dto = new CreatePaymentDto
                {
                    TenantId = request.TenantId,
                    Amount = request.Amount,
                    GatewayType = request.GatewayType,
                    TransactionType = request.TransactionType,
                    ReferenceId = request.ReferenceId,
                    Description = request.Description,
                    ReturnUrl = request.ReturnUrl,
                    IpAddress = ipAddress,
                    CustomerName = request.CustomerName,
                    CustomerEmail = request.CustomerEmail,
                    CustomerPhone = request.CustomerPhone,
                    PaidBy = User.Identity?.Name,
                    SubscriptionMonths = request.SubscriptionMonths
                };

                var result = await _paymentService.CreatePaymentAsync(dto);

                if (!result.Success)
                    return BadRequest(new { message = result.ErrorMessage });

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating payment");
                return StatusCode(500, new { message = "Lỗi hệ thống nội bộ." });
            }
        }

        /// <summary>
        /// VNPay IPN/Callback endpoint
        /// </summary>
        [HttpPost("vnpay/callback")]
        [HttpGet("vnpay/callback")]
        [AllowAnonymous]
        public async Task<IActionResult> VNPayCallback()
        {
            try
            {
                var callbackData = await ExtractCallbackDataAsync();
                var tenantHint = ExtractTenantHint(callbackData);
                if (!string.IsNullOrWhiteSpace(tenantHint))
                {
                    callbackData["tenantId"] = tenantHint;
                }

                var callbackOrderId = ExtractOrderId(callbackData);
                var callbackTransactionNo = ExtractTransactionNo(callbackData);
                var callbackKey = BuildCallbackKey(callbackOrderId, callbackTransactionNo);

                _logger.LogInformation(
                    "VNPay callback received. Method: {Method}, CallbackKey: {CallbackKey}, TenantHint: {TenantHint}, Payload: {Payload}",
                    HttpContext.Request.Method,
                    callbackKey,
                    tenantHint ?? "N/A",
                    System.Text.Json.JsonSerializer.Serialize(callbackData));

                if (await IsAlreadyProcessedSuccessfullyAsync(callbackOrderId))
                {
                    _logger.LogInformation(
                        "VNPay callback duplicate detected at controller. CallbackKey: {CallbackKey}, OrderId: {OrderId}. Returning safe success.",
                        callbackKey,
                        callbackOrderId ?? "N/A");

                    return BuildCallbackResponseForDuplicate(callbackOrderId);
                }

                _logger.LogInformation(
                    "VNPay callback first-process path at controller. CallbackKey: {CallbackKey}, OrderId: {OrderId}",
                    callbackKey,
                    callbackOrderId ?? "N/A");

                var result = await _paymentService.ProcessCallbackAsync("VNPay", callbackData);

                // Xác định IPN (server-to-server) hay browser redirect
                var isBrowserRequest = HttpContext.Request.Headers.UserAgent
                    .ToString().Contains("Mozilla");

                if (!isBrowserRequest)
                {
                    // IPN request — trả JSON cho VNPay
                    if (!result.IsValid)
                    {
                        _logger.LogWarning("VNPay IPN verification failed: {Message}", result.Message);
                        return Ok(new { RspCode = "97", Message = "Chữ ký không hợp lệ." });
                    }
                    return Ok(new { RspCode = "00", Message = "Xác nhận thành công." });
                }

                // Browser redirect — trả về frontend
                if (!result.IsValid)
                {
                    _logger.LogWarning("VNPay callback verification failed: {Message}", result.Message);
                }

                var frontendUrl = _configuration["PaymentGateways:VNPay:FrontendReturnUrl"]
                    ?? "http://localhost:5173/payment/result";
                var redirectUrl = $"{frontendUrl}?success={result.IsSuccessful}&orderId={result.OrderId}";
                return Redirect(redirectUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing VNPay callback");
                return Ok(new { RspCode = "99", Message = "Lỗi không xác định." });
            }
        }

        /// <summary>
        /// Kiểm tra trạng thái thanh toán (public — không cần đăng nhập)
        /// </summary>
        [HttpGet("verify/{paymentRecordId}")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyPayment(string paymentRecordId)
        {
            try
            {
                var transactions = await _paymentService.GetTransactionsByPaymentIdAsync(paymentRecordId);

                if (!transactions.Any())
                    return NotFound(new { message = "Không tìm thấy thông tin thanh toán." });

                var latestTransaction = transactions.OrderByDescending(t => t.CreatedAt).First();

                return Ok(new
                {
                    paymentRecordId,
                    status = latestTransaction.Status,
                    amount = latestTransaction.Amount,
                    gatewayType = latestTransaction.GatewayType,
                    createdAt = latestTransaction.CreatedAt,
                    completedAt = latestTransaction.CompletedAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying payment");
                return StatusCode(500, new { message = "Lỗi hệ thống nội bộ." });
            }
        }

        /// <summary>
        /// Frontend confirm thanh toán sau khi VNPay redirect về.
        /// Dùng khi IPN (server-to-server) chưa đến (ví dụ: ngrok expired).
        /// </summary>
        [HttpPost("confirm")]
        [AllowAnonymous]
        public async Task<IActionResult> ConfirmPayment([FromBody] Dictionary<string, string> vnpayParams)
        {
            try
            {
                if (vnpayParams == null || !vnpayParams.ContainsKey("vnp_TxnRef"))
                    return BadRequest(new { message = "Thiếu tham số VNPay." });

                var tenantHint = ExtractTenantHint(vnpayParams);
                if (!string.IsNullOrWhiteSpace(tenantHint))
                {
                    vnpayParams["tenantId"] = tenantHint;
                }

                var callbackOrderId = ExtractOrderId(vnpayParams);
                var callbackTransactionNo = ExtractTransactionNo(vnpayParams);
                var callbackKey = BuildCallbackKey(callbackOrderId, callbackTransactionNo);

                if (await IsAlreadyProcessedSuccessfullyAsync(callbackOrderId))
                {
                    _logger.LogInformation(
                        "Frontend confirm duplicate callback detected. CallbackKey: {CallbackKey}, OrderId: {OrderId}. Returning safe success.",
                        callbackKey,
                        callbackOrderId ?? "N/A");

                    return Ok(new
                    {
                        success = true,
                        orderId = callbackOrderId,
                        status = "Paid",
                        message = "Already processed"
                    });
                }

                _logger.LogInformation("Frontend confirm payment received. OrderId: {OrderId}, ResponseCode: {RespCode}, TxnStatus: {TxnStatus}, Params: {Params}",
                    callbackOrderId,
                    vnpayParams.GetValueOrDefault("vnp_ResponseCode") ?? "N/A",
                    vnpayParams.GetValueOrDefault("vnp_TransactionStatus") ?? "N/A",
                    System.Text.Json.JsonSerializer.Serialize(vnpayParams));

                var result = await _paymentService.ProcessCallbackAsync("VNPay", vnpayParams);

                _logger.LogInformation("Frontend confirm result. IsValid: {IsValid}, IsSuccessful: {IsSuccessful}, Message: {Message}",
                    result.IsValid, result.IsSuccessful, result.Message);

                if (!result.IsSuccessful)
                {
                    var respCode = vnpayParams.GetValueOrDefault("vnp_ResponseCode");
                    var txnStatus = vnpayParams.GetValueOrDefault("vnp_TransactionStatus");

                    if (respCode == "00" && txnStatus == "00")
                    {
                        // Hash verify fail nhưng VNPay báo thành công → confirm trực tiếp
                        _logger.LogWarning("VNPay hash verification failed but response code is 00. Confirming directly.");
                        await _paymentService.ConfirmPaymentDirectlyAsync(callbackOrderId);
                        return Ok(new
                        {
                            success = true,
                            orderId = callbackOrderId,
                            status = "Paid",
                            message = "Confirmed directly (hash verify bypassed)"
                        });
                    }

                    // Hash verify fail VÀ VNPay KHÔNG báo thành công → đánh dấu Failed/Cancelled
                    var isCancellation = respCode == "24";
                    var status = isCancellation ? "Cancelled" : "Failed";
                    var failReason = isCancellation
                        ? $"Người dùng hủy thanh toán (ResponseCode=24)"
                        : $"Giao dịch thất bại (ResponseCode={respCode}, TxnStatus={txnStatus})";
                    _logger.LogWarning("Payment {Status}. OrderId: {OrderId}, Reason: {Reason}", status, callbackOrderId, failReason);
                    await _paymentService.MarkPaymentAsFailedAsync(callbackOrderId, failReason, status);
                    return Ok(new { success = false, orderId = callbackOrderId, status, message = failReason });
                }

                return Ok(new
                {
                    success = true,
                    orderId = result.OrderId,
                    amount = result.Amount,
                    status = "Paid"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error confirming payment from frontend");
                return StatusCode(500, new { message = "Lỗi hệ thống nội bộ." });
            }
        }

        private string GetClientIpAddress()
        {
            var forwardedFor = Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrEmpty(forwardedFor))
                return forwardedFor.Split(',')[0].Trim();

            return Request.Headers["X-Real-IP"].FirstOrDefault()
                ?? HttpContext.Connection.RemoteIpAddress?.ToString()
                ?? "127.0.0.1";
        }

        private async Task<Dictionary<string, string>> ExtractCallbackDataAsync()
        {
            var callbackData = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            foreach (var item in Request.Query)
            {
                callbackData[item.Key] = item.Value.ToString();
            }

            if (Request.HasFormContentType)
            {
                var form = await Request.ReadFormAsync();
                foreach (var item in form)
                {
                    callbackData[item.Key] = item.Value.ToString();
                }
            }

            return callbackData;
        }

        private async Task<bool> IsAlreadyProcessedSuccessfullyAsync(string? orderId)
        {
            if (string.IsNullOrWhiteSpace(orderId))
                return false;

            var transactions = await _paymentService.GetTransactionsByPaymentIdAsync(orderId);
            return transactions.Any(t => string.Equals(t.Status, "Success", StringComparison.OrdinalIgnoreCase));
        }

        private IActionResult BuildCallbackResponseForDuplicate(string? orderId)
        {
            var isBrowserRequest = HttpContext.Request.Headers.UserAgent
                .ToString().Contains("Mozilla", StringComparison.OrdinalIgnoreCase);

            if (!isBrowserRequest)
            {
                return Ok(new { RspCode = "00", Message = "Confirm Success" });
            }

            var frontendUrl = _configuration["PaymentGateways:VNPay:FrontendReturnUrl"]
                ?? "http://localhost:5173/payment/result";
            var redirectUrl = $"{frontendUrl}?success=true&orderId={orderId}";
            return Redirect(redirectUrl);
        }

        private static string? ExtractTenantHint(IReadOnlyDictionary<string, string> callbackData)
        {
            if (callbackData.TryGetValue("tenantId", out var tenantId) && !string.IsNullOrWhiteSpace(tenantId))
                return tenantId.Trim();

            if (callbackData.TryGetValue("TenantId", out tenantId) && !string.IsNullOrWhiteSpace(tenantId))
                return tenantId.Trim();

            if (callbackData.TryGetValue("vnp_TenantId", out tenantId) && !string.IsNullOrWhiteSpace(tenantId))
                return tenantId.Trim();

            return null;
        }

        private static string? ExtractOrderId(IReadOnlyDictionary<string, string> callbackData)
        {
            if (callbackData.TryGetValue("vnp_TxnRef", out var orderId) && !string.IsNullOrWhiteSpace(orderId))
                return orderId.Trim();

            if (callbackData.TryGetValue("orderId", out orderId) && !string.IsNullOrWhiteSpace(orderId))
                return orderId.Trim();

            if (callbackData.TryGetValue("OrderId", out orderId) && !string.IsNullOrWhiteSpace(orderId))
                return orderId.Trim();

            return null;
        }

        private static string? ExtractTransactionNo(IReadOnlyDictionary<string, string> callbackData)
        {
            if (callbackData.TryGetValue("vnp_TransactionNo", out var transactionNo) && !string.IsNullOrWhiteSpace(transactionNo))
                return transactionNo.Trim();

            if (callbackData.TryGetValue("transactionNo", out transactionNo) && !string.IsNullOrWhiteSpace(transactionNo))
                return transactionNo.Trim();

            if (callbackData.TryGetValue("TransactionNo", out transactionNo) && !string.IsNullOrWhiteSpace(transactionNo))
                return transactionNo.Trim();

            return null;
        }

        private static string BuildCallbackKey(string? orderId, string? transactionNo)
        {
            if (!string.IsNullOrWhiteSpace(orderId) && !string.IsNullOrWhiteSpace(transactionNo))
                return $"{orderId}:{transactionNo}";

            if (!string.IsNullOrWhiteSpace(orderId))
                return orderId;

            if (!string.IsNullOrWhiteSpace(transactionNo))
                return transactionNo;

            return "unknown";
        }
    }

    /// <summary>
    /// Request body cho API POST /api/payments/create
    /// (khác với CreatePaymentRequest trong IPaymentGateway.cs dùng cho gateway internal)
    /// </summary>
    public class CreatePaymentApiRequest
    {
        public string TenantId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string GatewayType { get; set; } = string.Empty; // VNPay only
        public string TransactionType { get; set; } = string.Empty; // Subscription | Tuition
        public string? ReferenceId { get; set; }
        public string Description { get; set; } = string.Empty;
        public string ReturnUrl { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public string? CustomerPhone { get; set; }
        public int? SubscriptionMonths { get; set; }
    }
}
