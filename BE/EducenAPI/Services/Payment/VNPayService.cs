using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using EducenAPI.Services.Interface;

namespace EducenAPI.Services.Payment
{
    public class VNPayService : IPaymentGateway
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<VNPayService> _logger;

        public string GatewayName => "VNPay";

        public VNPayService(IConfiguration configuration, ILogger<VNPayService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public Task<PaymentGatewayResponse> CreatePaymentAsync(CreatePaymentRequest request)
        {
            try
            {
                var vnp_TmnCode = _configuration["PaymentGateways:VNPay:TmnCode"]!;
                var vnp_HashSecret = _configuration["PaymentGateways:VNPay:HashSecret"]!;
                var vnp_Url = _configuration["PaymentGateways:VNPay:BaseUrl"]!;
                // Sandbox: dùng frontend URL trực tiếp (bypass ngrok interstitial)
                var vnp_ReturnUrl = _configuration["PaymentGateways:VNPay:FrontendReturnUrl"]
                    ?? "http://localhost:5173/payment/result";

                // Convert amount to VND (VNPay uses smallest currency unit)
                var vnp_Amount = (long)(request.Amount * 100);

                var vnp_TxnRef = request.OrderId;
                var vnp_OrderInfo = request.Description;
                var vnp_OrderType = "other";
                //var vnp_IpAddr = request.IpAddress;
                var vnp_IpAddr = request.IpAddress;

                if (vnp_IpAddr == "::1")
                {
                    vnp_IpAddr = "127.0.0.1";
                }

                var tick = DateTime.Now.Ticks.ToString();
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
                    // URL-encode cả key và value (uppercase hex) cho signing data
                    var encodedKey = UrlEncode(param.Key);
                    var encodedValue = UrlEncode(param.Value ?? "");

                    if (hashData.Length > 0)
                        hashData.Append('&');
                    hashData.Append($"{encodedKey}={encodedValue}");

                    if (query.Length > 0)
                        query.Append('&');
                    query.Append($"{encodedKey}={encodedValue}");
                }

                var signData = hashData.ToString();
                var secureHash = HmacSHA512(vnp_HashSecret, signData);
                var vnp_SecureHash = secureHash.ToLower();

                var paymentUrl = $"{vnp_Url}?{query}&vnp_SecureHash={vnp_SecureHash}";

                // Debug logging — xóa sau khi test xong
                _logger.LogWarning("=== VNPay DEBUG ===");
                _logger.LogWarning("HashSecret: {Secret}", vnp_HashSecret);
                _logger.LogWarning("SignData: {Data}", signData);
                _logger.LogWarning("SecureHash: {Hash}", vnp_SecureHash);
                _logger.LogWarning("PaymentUrl: {Url}", paymentUrl);
                _logger.LogWarning("===================");
                _logger.LogInformation("VNPay payment URL created for Order {OrderId}", request.OrderId);

                return Task.FromResult(new PaymentGatewayResponse
                {
                    Success = true,
                    PaymentUrl = paymentUrl,
                    TransactionId = vnp_TxnRef,
                    AdditionalData = new Dictionary<string, object>
                    {
                        { "vnp_CreateDate", vnp_CreateDate },
                        { "vnp_TmnCode", vnp_TmnCode }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating VNPay payment for Order {OrderId}", request.OrderId);
                return Task.FromResult(new PaymentGatewayResponse
                {
                    Success = false,
                    ErrorMessage = $"Failed to create VNPay payment: {ex.Message}"
                });
            }
        }

        public Task<PaymentVerificationResult> VerifyCallbackAsync(Dictionary<string, string> callbackData)
        {
            try
            {
                var vnp_HashSecret = _configuration["PaymentGateways:VNPay:HashSecret"]!;

                // Extract secure hash from callback
                var vnp_SecureHash = callbackData.GetValueOrDefault("vnp_SecureHash");
                if (string.IsNullOrEmpty(vnp_SecureHash))
                {
                    return Task.FromResult(new PaymentVerificationResult
                    {
                        IsValid = false,
                        Message = "Missing secure hash"
                    });
                }

                // Remove hash from data for verification
                var dataToVerify = callbackData
    .Where(x => x.Key != "vnp_SecureHash" && x.Key != "vnp_SecureHashType")
    .OrderBy(x => x.Key, StringComparer.Ordinal)
    .ToList();

                var queryBuilder = new StringBuilder();

                foreach (var param in dataToVerify)
                {
                    // URL-encode cả key và value (uppercase hex) cho signing data
                    var encodedKey = UrlEncode(param.Key);
                    var encodedValue = UrlEncode(param.Value ?? "");

                    if (queryBuilder.Length > 0)
                        queryBuilder.Append('&');
                    queryBuilder.Append($"{encodedKey}={encodedValue}");
                }

                var signData = queryBuilder.ToString();
                var calculatedHash = HmacSHA512(vnp_HashSecret, signData);

                // Debug logging — xóa sau khi test xong
                _logger.LogWarning("=== VNPay Callback DEBUG ===");
                _logger.LogWarning("HashSecret: {Secret}", vnp_HashSecret);
                _logger.LogWarning("SignData: {Data}", signData);
                _logger.LogWarning("CalculatedHash: {Hash}", calculatedHash);
                _logger.LogWarning("ReceivedHash: {Hash}", vnp_SecureHash);
                _logger.LogWarning("============================");

                if (!calculatedHash.Equals(vnp_SecureHash, StringComparison.InvariantCultureIgnoreCase))
                {
                    _logger.LogWarning("VNPay callback hash mismatch");
                    return Task.FromResult(new PaymentVerificationResult
                    {
                        IsValid = false,
                        Message = "Invalid secure hash"
                    });
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

                return Task.FromResult(new PaymentVerificationResult
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
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying VNPay callback");
                return Task.FromResult(new PaymentVerificationResult
                {
                    IsValid = false,
                    Message = $"Verification error: {ex.Message}"
                });
            }
        }

        public async Task<RefundResponse> ProcessRefundAsync(RefundRequest request)
        {
            try
            {
                var vnp_TmnCode = _configuration["PaymentGateways:VNPay:TmnCode"]!;
                var vnp_HashSecret = _configuration["PaymentGateways:VNPay:HashSecret"]!;
                var vnp_ApiUrl = _configuration["PaymentGateways:VNPay:ApiUrl"]!;

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
                    AdditionalData = new Dictionary<string, object> { { "response", responseBody } }
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
    }
}
