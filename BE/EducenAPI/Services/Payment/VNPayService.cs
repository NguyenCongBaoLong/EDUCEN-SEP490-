using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using EducenAPI.Services.Interface;

namespace EducenAPI.Services.Payment
{
    public class VNPayService : IPaymentGateway
    {
        private const string GatewayType = "VNPay";
        private const string DefaultTenantId = "default-tenant";

        private readonly ITenantPaymentGatewayConfigService _tenantPaymentGatewayConfigService;
        private readonly ILogger<VNPayService> _logger;

        public string GatewayName => "VNPay";

        public VNPayService(
            ITenantPaymentGatewayConfigService tenantPaymentGatewayConfigService,
            ILogger<VNPayService> logger)
        {
            _tenantPaymentGatewayConfigService = tenantPaymentGatewayConfigService;
            _logger = logger;
        }

        public async Task<PaymentGatewayResponse> CreatePaymentAsync(CreatePaymentRequest request)
        {
            try
            {
                var config = await ResolveEffectiveConfigAsync(request.TenantId, "create payment", request.OrderId);
                var vnp_TmnCode = config.TmnCode;
                var vnp_HashSecret = config.HashSecret;
                var vnp_Url = config.BaseUrl;
                // Ưu tiên ReturnUrl từ request (frontend gửi kèm tenant params), fallback về config
                var vnp_ReturnUrl = !string.IsNullOrWhiteSpace(request.ReturnUrl)
                    ? request.ReturnUrl
                    : config.ReturnUrl;

                // Convert amount to VND (VNPay uses smallest currency unit)
                var vnp_Amount = (long)(request.Amount * 100);

                var vnp_TxnRef = request.OrderId;
                var vnp_OrderInfo = request.Description;
                var vnp_OrderType = "other";
                var vnp_IpAddr = request.IpAddress;

                if (vnp_IpAddr == "::1")
                {
                    vnp_IpAddr = "127.0.0.1";
                }

                var vnp_CreateDate = DateTime.Now.ToString("yyyyMMddHHmmss");

                // Build VNPay parameters
                var vnp_Params = new Dictionary<string, string>
                {
                    { "vnp_Version", "2.1.0" },
                    { "vnp_Command", "pay" },
                    { "vnp_TmnCode", vnp_TmnCode },
                    { "vnp_Amount", vnp_Amount.ToString() },
                    { "vnp_CurrCode", "VND" },
                    { "vnp_TxnRef", vnp_TxnRef },
                    { "vnp_OrderInfo", vnp_OrderInfo },
                    { "vnp_OrderType", vnp_OrderType },
                    { "vnp_Locale", "vn" },
                    { "vnp_ReturnUrl", vnp_ReturnUrl },
                    { "vnp_IpAddr", vnp_IpAddr },
                    { "vnp_CreateDate", vnp_CreateDate }
                };

                // Add optional billing info
                if (!string.IsNullOrEmpty(request.CustomerEmail))
                    vnp_Params.Add("vnp_Bill_Email", request.CustomerEmail);

                if (!string.IsNullOrEmpty(request.CustomerPhone))
                    vnp_Params.Add("vnp_Bill_Mobile", request.CustomerPhone);

                // Build query string with sorted keys
                var sortedParams = vnp_Params
    .OrderBy(x => x.Key, StringComparer.Ordinal)
    .ToList();

                var hashData = new StringBuilder();
                var query = new StringBuilder();

                foreach (var param in sortedParams)
                {
                    var rawKey = param.Key;
                    var rawValue = param.Value ?? "";

                    // URL-encoded cho query URL
                    var encodedKey = UrlEncode(rawKey);
                    var encodedValue = UrlEncode(rawValue);

                    if (query.Length > 0)
                        query.Append('&');
                    query.Append($"{encodedKey}={encodedValue}");

                    // Signing data: URL-encoded (VNPay verify payment URL bằng URL-encoded data)
                    if (hashData.Length > 0)
                        hashData.Append('&');
                    hashData.Append($"{encodedKey}={encodedValue}");
                }

                var signData = hashData.ToString();
                var secureHash = HmacSHA512(vnp_HashSecret, signData);
                var vnp_SecureHash = secureHash.ToLower();

                var paymentUrl = $"{vnp_Url}?{query}&vnp_SecureHash={vnp_SecureHash}";

                _logger.LogDebug("VNPay CreatePayment - SignData: {SignData}, SecureHash: {Hash}", signData, vnp_SecureHash);
                _logger.LogInformation(
                    "VNPay payment URL created. OrderId: {OrderId}, TmnCode: {TmnCode}, ConfigSource: {Source}",
                    request.OrderId, vnp_TmnCode, config.Source);

                return new PaymentGatewayResponse
                {
                    Success = true,
                    PaymentUrl = paymentUrl,
                    TransactionId = vnp_TxnRef,
                    AdditionalData = new Dictionary<string, object>
                    {
                        { "vnp_CreateDate", vnp_CreateDate },
                        { "vnp_TmnCode", vnp_TmnCode },
                        { "configSource", config.Source }
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating VNPay payment for Order {OrderId}", request.OrderId);
                return new PaymentGatewayResponse
                {
                    Success = false,
                    ErrorMessage = $"Failed to create VNPay payment: {ex.Message}"
                };
            }
        }

        public async Task<PaymentVerificationResult> VerifyCallbackAsync(Dictionary<string, string> callbackData)
        {
            try
            {
                var config = await ResolveEffectiveConfigAsync(ExtractTenantId(callbackData), "verify callback");
                var vnp_HashSecret = config.HashSecret;

                // Extract secure hash from callback
                var vnp_SecureHash = callbackData.GetValueOrDefault("vnp_SecureHash");
                if (string.IsNullOrEmpty(vnp_SecureHash))
                {
                    return new PaymentVerificationResult
                    {
                        IsValid = false,
                        Message = "Missing secure hash"
                    };
                }

                // Remove hash from data for verification — only include vnp_ keys
                // KHÔNG exclude vnp_ReturnUrl - VNPay include trong callback signing
                var dataToVerify = callbackData
    .Where(x => x.Key.StartsWith("vnp_") && x.Key != "vnp_SecureHash" && x.Key != "vnp_SecureHashType")
    .OrderBy(x => x.Key, StringComparer.Ordinal)
    .ToList();

                var queryBuilder = new StringBuilder();

                foreach (var param in dataToVerify)
                {
                    // URL-encoded signing - đồng bộ với CreatePaymentAsync
                    var encodedKey = UrlEncode(param.Key);
                    var encodedValue = UrlEncode(param.Value ?? "");

                    if (queryBuilder.Length > 0)
                        queryBuilder.Append('&');
                    queryBuilder.Append($"{encodedKey}={encodedValue}");
                }

                var signData = queryBuilder.ToString();
                var calculatedHash = HmacSHA512(vnp_HashSecret, signData);

                _logger.LogInformation("VNPay VerifyCallback. CalculatedHash: {CalcHash}, ReceivedHash: {RecvHash}",
                    calculatedHash[..16], vnp_SecureHash[..16]);

                if (!calculatedHash.Equals(vnp_SecureHash, StringComparison.InvariantCultureIgnoreCase))
                {
                    _logger.LogWarning("VNPay callback hash mismatch. SignData preview: [{SignData}]",
                        string.Join(", ", dataToVerify.Select(p => $"{p.Key}={p.Value}")));
                    return new PaymentVerificationResult
                    {
                        IsValid = false,
                        Message = "Invalid secure hash"
                    };
                }

                // Parse response
                var responseCode = callbackData.GetValueOrDefault("vnp_ResponseCode");
                var transactionStatus = callbackData.GetValueOrDefault("vnp_TransactionStatus");
                var isSuccessful = responseCode == "00" && transactionStatus == "00";

                var amount = 0m;
                if (callbackData.TryGetValue("vnp_Amount", out var amountStr) && long.TryParse(amountStr, out var amountVnd))
                {
                    amount = amountVnd / 100m; // Convert from smallest unit
                }

                _logger.LogInformation("VNPay callback verified for Order {OrderId}, Success: {Success}",
                    callbackData.GetValueOrDefault("vnp_TxnRef"), isSuccessful);

                return new PaymentVerificationResult
                {
                    IsValid = true,
                    IsSuccessful = isSuccessful,
                    TransactionId = callbackData.GetValueOrDefault("vnp_TxnRef"),
                    OrderId = callbackData.GetValueOrDefault("vnp_TxnRef"),
                    Amount = amount,
                    GatewayTransactionId = callbackData.GetValueOrDefault("vnp_TransactionNo"),
                    ResponseCode = responseCode,
                    Message = isSuccessful ? "Payment successful" : $"Payment failed with code: {responseCode}",
                    AdditionalData = callbackData.ToDictionary(x => x.Key, x => (object)x.Value)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying VNPay callback");
                return new PaymentVerificationResult
                {
                    IsValid = false,
                    Message = $"Verification error: {ex.Message}"
                };
            }
        }

        public async Task<RefundResponse> ProcessRefundAsync(RefundRequest request)
        {
            try
            {
                var config = await ResolveEffectiveConfigAsync(request.TenantId, "process refund", request.OrderId);
                var vnp_TmnCode = config.TmnCode;
                var vnp_HashSecret = config.HashSecret;
                var vnp_ApiUrl = config.ApiUrl;

                var vnp_RequestId = Guid.NewGuid().ToString();
                var vnp_Version = "2.1.0";
                var vnp_Command = "refund";
                var vnp_TransactionType = "02"; // Hoàn tiền toàn phần
                var vnp_TxnRef = request.OrderId;
                var vnp_Amount = ((long)(request.Amount * 100)).ToString();
                var vnp_TransactionNo = request.OriginalTransactionId;
                var vnp_TransactionDate = DateTime.Now.ToString("yyyyMMddHHmmss");
                var vnp_CreateBy = "System";
                var vnp_CreateDate = DateTime.Now.ToString("yyyyMMddHHmmss");
                var vnp_IpAddr = "127.0.0.1";
                var vnp_OrderInfo = $"Refund for order {request.OrderId}";

                var signData = $"{vnp_RequestId}|{vnp_Version}|{vnp_Command}|{vnp_TmnCode}|{vnp_TransactionType}|{vnp_TxnRef}|{vnp_Amount}|{vnp_TransactionNo}|{vnp_TransactionDate}|{vnp_CreateBy}|{vnp_CreateDate}|{vnp_IpAddr}|{vnp_OrderInfo}";
                var vnp_SecureHash = HmacSHA512(vnp_HashSecret, signData);

                var requestData = new
                {
                    vnp_RequestId,
                    vnp_Version,
                    vnp_Command,
                    vnp_TmnCode,
                    vnp_TransactionType,
                    vnp_TxnRef,
                    vnp_Amount,
                    vnp_TransactionNo,
                    vnp_TransactionDate,
                    vnp_CreateBy,
                    vnp_CreateDate,
                    vnp_IpAddr,
                    vnp_OrderInfo,
                    vnp_SecureHash
                };

                using var httpClient = new HttpClient();
                var content = new StringContent(
                    System.Text.Json.JsonSerializer.Serialize(requestData),
                    Encoding.UTF8,
                    "application/json");

                var response = await httpClient.PostAsync(vnp_ApiUrl, content);
                var responseBody = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("VNPay refund response: {Response}", responseBody);

                // Parse response (simplified - should parse actual VNPay API response format)
                var refundSuccess = response.IsSuccessStatusCode;

                return new RefundResponse
                {
                    Success = refundSuccess,
                    RefundTransactionId = vnp_RequestId,
                    AdditionalData = new Dictionary<string, object>
                    {
                        { "response", responseBody },
                        { "configSource", config.Source }
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing VNPay refund for Order {OrderId}", request.OrderId);
                return new RefundResponse
                {
                    Success = false,
                    ErrorMessage = $"Refund failed: {ex.Message}"
                };
            }
        }

        private static string HmacSHA512(string key, string inputData)
        {
            var keyBytes = Encoding.UTF8.GetBytes(key);
            var inputBytes = Encoding.UTF8.GetBytes(inputData);

            using var hmac = new HMACSHA512(keyBytes);
            var hashBytes = hmac.ComputeHash(inputBytes);

            return Convert.ToHexString(hashBytes).ToLower();
        }

        /// <summary>
        /// URL-encode với uppercase hex digits (VD: %3A thay vì %3a)
        /// VNPay server expects uppercase hex encoding
        /// </summary>
        private static string UrlEncode(string value)
        {
            if (string.IsNullOrEmpty(value)) return "";
            var encoded = HttpUtility.UrlEncode(value);
            // Chuyển %xx thành %XX (uppercase hex digits)
            return System.Text.RegularExpressions.Regex.Replace(
                encoded, @"%([0-9a-f]{2})",
                m => "%" + m.Groups[1].Value.ToUpper());
        }

        private async Task<EffectivePaymentGatewayConfig> ResolveEffectiveConfigAsync(
            string? tenantId,
            string operation,
            string? orderId = null)
        {
            // TenantId rỗng/null → Subscription payment → dùng global config (SystemAdmin's VNPay)
            // TenantId có giá trị → Tuition payment → ưu tiên per-tenant config, fallback global
            if (string.IsNullOrWhiteSpace(tenantId))
            {
                var globalConfig = _tenantPaymentGatewayConfigService.GetGlobalConfig(GatewayType);

                _logger.LogInformation(
                    "Resolved VNPay GLOBAL config for {Operation}. TmnCode: {TmnCode}, OrderId: {OrderId}",
                    operation,
                    globalConfig.TmnCode,
                    orderId ?? "N/A");

                return globalConfig;
            }

            var tenantConfig = await _tenantPaymentGatewayConfigService
                .GetEffectiveConfigAsync(tenantId.Trim(), GatewayType);

            _logger.LogDebug(
                "Resolved VNPay config for {Operation}. Tenant: {TenantId}, Source: {Source}, OrderId: {OrderId}",
                operation,
                tenantId.Trim(),
                tenantConfig.Source,
                orderId ?? "N/A");

            return tenantConfig;
        }

        private static string? ExtractTenantId(IReadOnlyDictionary<string, string> callbackData)
        {
            if (callbackData.TryGetValue("tenantId", out var tenantId) && !string.IsNullOrWhiteSpace(tenantId))
            {
                return tenantId;
            }

            if (callbackData.TryGetValue("TenantId", out tenantId) && !string.IsNullOrWhiteSpace(tenantId))
            {
                return tenantId;
            }

            if (callbackData.TryGetValue("vnp_TenantId", out tenantId) && !string.IsNullOrWhiteSpace(tenantId))
            {
                return tenantId;
            }

            return null;
        }
    }
}
