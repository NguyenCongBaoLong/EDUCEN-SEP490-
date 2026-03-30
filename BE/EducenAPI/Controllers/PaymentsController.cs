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
                // Parse raw query string và decode giá trị
                var rawQuery = HttpContext.Request.QueryString.ToString();
                if (rawQuery.StartsWith("?"))
                    rawQuery = rawQuery.Substring(1);

                var callbackData = new Dictionary<string, string>();
                foreach (var pair in rawQuery.Split('&'))
                {
                    var parts = pair.Split('=', 2);
                    if (parts.Length == 2)
                        callbackData[parts[0]] = System.Web.HttpUtility.UrlDecode(parts[1]);
                    else if (parts.Length == 1)
                        callbackData[parts[0]] = "";
                }

                _logger.LogInformation("VNPay callback received: {Data}", rawQuery);

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

                _logger.LogInformation("Frontend confirm payment received: {Params}",
                    System.Text.Json.JsonSerializer.Serialize(vnpayParams));

                var result = await _paymentService.ProcessCallbackAsync("VNPay", vnpayParams);

                if (!result.IsSuccessful)
                    return Ok(new { success = false, message = result.Message });

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
