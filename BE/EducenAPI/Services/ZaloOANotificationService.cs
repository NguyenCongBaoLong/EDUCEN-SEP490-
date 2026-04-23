using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using EducenAPI.DTOs.ZaloOA;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EducenAPI.Services
{
    public class ZaloOANotificationService : IZaloOANotificationService
    {
        private readonly AdminDbContext _adminContext;
        private readonly EducenV2Context _tenantContext;
        private readonly ICurrentTenantService _tenantService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<ZaloOANotificationService> _logger;
        private readonly string _encryptionKey;

        private const string ZALO_API_BASE = "https://openapi.zalo.me/v3.0";
        private const string ZALO_OAUTH_BASE = "https://oauth.zalo.me/v4";

        public ZaloOANotificationService(
            AdminDbContext adminContext,
            EducenV2Context tenantContext,
            ICurrentTenantService tenantService,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<ZaloOANotificationService> logger)
        {
            _adminContext = adminContext;
            _tenantContext = tenantContext;
            _tenantService = tenantService;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _encryptionKey = configuration["ZaloOA:EncryptionKey"]
                ?? "EducenDefaultKey32BytesLong!!!!";
        }

        // ============================
        // SYSTEM ADMIN — CONFIG
        // ============================

        public async Task<ZaloOAConfigResponse> SetupConfigAsync(string tenantId, SetupZaloOARequest request)
        {
            var tenant = await _adminContext.Tenants.FindAsync(tenantId)
                ?? throw new Exception("Trung tâm không tồn tại.");

            var existing = await _adminContext.TenantZaloOAConfigs
                .FirstOrDefaultAsync(c => c.TenantId == tenantId);

            var encryptedSecret = Encrypt(request.SecretKey);

            if (existing != null)
            {
                existing.AppId = request.AppId;
                existing.OAId = request.OAId;
                existing.EncryptedSecretKey = encryptedSecret;
                existing.IsActive = false;
                existing.UpdatedAt = DateTime.UtcNow;
                existing.EncryptedAccessToken = null;
                existing.EncryptedRefreshToken = null;
                existing.TokenExpiresAt = null;
            }
            else
            {
                existing = new TenantZaloOAConfig
                {
                    TenantId = tenantId,
                    AppId = request.AppId,
                    OAId = request.OAId,
                    EncryptedSecretKey = encryptedSecret,
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _adminContext.TenantZaloOAConfigs.Add(existing);
            }

            await _adminContext.SaveChangesAsync();

            return MapToResponse(existing, tenant.TenantName);
        }

        public async Task<ZaloOAConfigResponse?> GetConfigAsync(string tenantId)
        {
            var config = await _adminContext.TenantZaloOAConfigs
                .Include(c => c.Tenant)
                .FirstOrDefaultAsync(c => c.TenantId == tenantId);

            if (config == null) return null;

            return MapToResponse(config, config.Tenant.TenantName);
        }

        public async Task<List<ZaloOAConfigResponse>> GetAllConfigsAsync()
        {
            var configs = await _adminContext.TenantZaloOAConfigs
                .Include(c => c.Tenant)
                .OrderByDescending(c => c.UpdatedAt)
                .ToListAsync();

            return configs.Select(c => MapToResponse(c, c.Tenant.TenantName)).ToList();
        }

        public async Task<bool> DeleteConfigAsync(string tenantId)
        {
            var config = await _adminContext.TenantZaloOAConfigs
                .FirstOrDefaultAsync(c => c.TenantId == tenantId);

            if (config == null) return false;

            _adminContext.TenantZaloOAConfigs.Remove(config);
            await _adminContext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> VerifyConnectionAsync(string tenantId)
        {
            var config = await _adminContext.TenantZaloOAConfigs
                .FirstOrDefaultAsync(c => c.TenantId == tenantId);

            if (config == null)
                throw new Exception("Trung tâm chưa cấu hình Zalo OA.");

            var appId = config.AppId;
            var oaId = config.DisplayId;

            _logger.LogInformation("=== Verify Zalo OA Connection for tenant {TenantId} ===", tenantId);
            _logger.LogInformation("AppId: {AppId}, OAId: {OAId}, IsActive: {IsActive}, HasAccessToken: {HasAT}, HasRefreshToken: {HasRT}, TokenExpiresAt: {Exp}",
                appId, oaId, config.IsActive,
                !string.IsNullOrEmpty(config.EncryptedAccessToken),
                !string.IsNullOrEmpty(config.EncryptedRefreshToken),
                config.TokenExpiresAt);

            if (string.IsNullOrWhiteSpace(appId))
                throw new Exception("App ID trong cấu hình bị rỗng. Vui lòng cập nhật lại cấu hình.");

            if (string.IsNullOrWhiteSpace(config.EncryptedSecretKey))
                throw new Exception("Secret Key trong cấu hình bị rỗng. Vui lòng cập nhật lại cấu hình.");

            if (string.IsNullOrEmpty(config.EncryptedAccessToken))
                throw new Exception("Chưa hoàn tất cấp quyền Zalo OA. Vui lòng bấm nút 'Cấp quyền' (key icon) để ủy quyền qua Zalo trước, sau đó mới kiểm tra kết nối.");

            if (config.TokenExpiresAt.HasValue && config.TokenExpiresAt.Value < DateTime.UtcNow)
            {
                _logger.LogInformation("Token expired at {ExpiresAt}, attempting refresh", config.TokenExpiresAt);

                if (!string.IsNullOrEmpty(config.EncryptedRefreshToken))
                {
                    try
                    {
                        var secretKey = Decrypt(config.EncryptedSecretKey);
                        var refreshToken = Decrypt(config.EncryptedRefreshToken);
                        var tokenResponse = await RefreshTokenAsync(config.AppId, secretKey, refreshToken);

                        if (tokenResponse != null && !string.IsNullOrEmpty(tokenResponse.AccessToken))
                        {
                            config.EncryptedAccessToken = Encrypt(tokenResponse.AccessToken);
                            if (tokenResponse.RefreshToken != null)
                                config.EncryptedRefreshToken = Encrypt(tokenResponse.RefreshToken);
                            config.TokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);
                            config.IsActive = true;
                            config.UpdatedAt = DateTime.UtcNow;
                            await _adminContext.SaveChangesAsync();
                            _logger.LogInformation("Token refreshed successfully for tenant {TenantId}", tenantId);
                            return true;
                        }

                        _logger.LogWarning("Token refresh returned null or empty access_token for tenant {TenantId}. Error: {Error}",
                            tenantId, tokenResponse?.ErrorMessage ?? "null response");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to refresh token for tenant {TenantId}: {Message}", tenantId, ex.Message);
                    }
                }

                config.IsActive = false;
                config.UpdatedAt = DateTime.UtcNow;
                await _adminContext.SaveChangesAsync();
                throw new Exception("Token Zalo OA đã hết hạn và không thể làm mới. Vui lòng cấp quyền lại.");
            }

            config.IsActive = true;
            config.UpdatedAt = DateTime.UtcNow;
            await _adminContext.SaveChangesAsync();
            return true;
        }

        public async Task<object> TestCredentialsAsync(string tenantId)
        {
            var config = await _adminContext.TenantZaloOAConfigs
                .FirstOrDefaultAsync(c => c.TenantId == tenantId);

            if (config == null)
                throw new Exception("Trung tâm chưa cấu hình Zalo OA.");

            var secretKey = Decrypt(config.EncryptedSecretKey);

            var result = new
            {
                oaId = config.AppId,
                oaIdLength = config.AppId?.Length ?? 0,
                secretKeyLength = secretKey?.Length ?? 0,
                secretKeyPrefix = secretKey?.Length > 4 ? secretKey[..4] + "..." : secretKey,
                hasAccessToken = !string.IsNullOrEmpty(config.EncryptedAccessToken),
                hasRefreshToken = !string.IsNullOrEmpty(config.EncryptedRefreshToken),
                isActive = config.IsActive,
                tokenExpiresAt = config.TokenExpiresAt,
                isTokenExpired = config.TokenExpiresAt.HasValue && config.TokenExpiresAt.Value < DateTime.UtcNow
            };

            _logger.LogInformation("=== Zalo OA Config Debug === {@Config}", result);
            return result;
        }

        public string GetAuthorizationUrl(string tenantId)
        {
            var baseUrl = "https://oauth.zaloapp.com/v4/oa/permission";
            var url = $"{baseUrl}?app_id={{0}}&redirect_uri={{1}}&state={tenantId}";
            return url;
        }

        public async Task<bool> HandleOAuthCallbackAsync(string tenantId, string code)
        {
            var config = await _adminContext.TenantZaloOAConfigs
                .FirstOrDefaultAsync(c => c.TenantId == tenantId);

            if (config == null)
                throw new Exception("Trung tâm chưa cấu hình Zalo OA.");

            var secretKey = Decrypt(config.EncryptedSecretKey);

            _logger.LogInformation("=== Zalo OAuth Callback Start ===");
            _logger.LogInformation("Tenant: {TenantId}", tenantId);
            _logger.LogInformation("OAId (app_id): {OAId} (length: {Len})", config.AppId, config.AppId?.Length ?? 0);
            _logger.LogInformation("SecretKey length: {Len}", secretKey?.Length ?? 0);
            _logger.LogInformation("Code length: {Len}, first 8 chars: {CodePrefix}", code?.Length ?? 0,
                code?.Length > 8 ? code[..8] + "..." : code);

            if (string.IsNullOrWhiteSpace(config.AppId))
                throw new Exception("OA ID (App ID) trong cấu hình bị rỗng. Vui lòng cập nhật lại cấu hình.");

            if (string.IsNullOrWhiteSpace(secretKey))
                throw new Exception("Secret Key trong cấu hình bị rỗng. Vui lòng cập nhật lại cấu hình.");

            var tokenResponse = await GetAccessTokenAsync(config.AppId, secretKey, code);

            if (tokenResponse == null)
            {
                _logger.LogError("Zalo token exchange returned null. Check previous logs for HTTP errors. app_id={AppId}", config.AppId);
                throw new Exception("Không thể kết nối đến Zalo API. Vui lòng kiểm tra kết nối mạng và xem log backend để biết chi tiết.");
            }

            if (!string.IsNullOrEmpty(tokenResponse.ErrorMessage))
            {
                _logger.LogError("Zalo token exchange FAILED: {Error}. app_id={AppId}", tokenResponse.ErrorMessage, config.AppId);
                throw new Exception($"Zalo từ chối kết nối: {tokenResponse.ErrorMessage}. Vui lòng kiểm tra: 1) App ID có đúng là số từ Zalo Developer Portal, 2) Secret Key có đúng, 3) Redirect URI đã đăng ký trong Zalo Developer Portal.");
            }

            if (string.IsNullOrEmpty(tokenResponse.AccessToken))
            {
                _logger.LogError("Zalo response has no access_token. app_id={AppId}", config.AppId);
                throw new Exception("Không thể lấy access token từ Zalo. Vui lòng kiểm tra App ID, Secret Key và code.");
            }

            config.EncryptedAccessToken = Encrypt(tokenResponse.AccessToken);
            config.EncryptedRefreshToken = tokenResponse.RefreshToken != null
                ? Encrypt(tokenResponse.RefreshToken)
                : null;
            config.TokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);
            config.IsActive = true;
            config.UpdatedAt = DateTime.UtcNow;

            await _adminContext.SaveChangesAsync();
            _logger.LogInformation("=== Zalo OAuth Callback SUCCESS for tenant {TenantId} ===", tenantId);
            return true;
        }

        // ============================
        // TENANT ADMIN — OPERATIONS
        // ============================

        public async Task<ZaloOAStatusResponse> GetStatusAsync(string tenantId)
        {
            var config = await _adminContext.TenantZaloOAConfigs
                .FirstOrDefaultAsync(c => c.TenantId == tenantId);

            int followerCount = 0;
            try
            {
                followerCount = await _tenantContext.ZaloOARecipients
                    .CountAsync(r => r.IsFollowing);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ZaloOARecipients table not found for tenant {TenantId}", tenantId);
            }

            if (config == null)
            {
                return new ZaloOAStatusResponse
                {
                    IsConfigured = false,
                    IsActive = false,
                    FollowerCount = followerCount
                };
            }

            return new ZaloOAStatusResponse
            {
                IsConfigured = true,
                IsActive = config.IsActive,
                OAId = config.AppId,
                FollowerCount = followerCount,
                TokenExpiresAt = config.TokenExpiresAt,
                IsTokenExpired = config.TokenExpiresAt.HasValue && config.TokenExpiresAt.Value < DateTime.UtcNow
            };
        }

        public async Task<SendZaloMessageResponse> SendBatchMessageAsync(string tenantId, int userId, SendZaloMessageRequest request)
        {
            var result = new SendZaloMessageResponse();

            var config = await _adminContext.TenantZaloOAConfigs
                .FirstOrDefaultAsync(c => c.TenantId == tenantId);

            if (config == null || !config.IsActive)
                throw new Exception("Zalo OA chưa được kích hoạt cho trung tâm này.");

            // Ensure token is fresh
            var accessToken = await EnsureAccessTokenAsync(config);

            // Get recipients
            List<ZaloOARecipient> recipients;
            try
            {
                recipients = await _tenantContext.ZaloOARecipients
                    .Where(r => r.IsFollowing)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ZaloOARecipients table not found for tenant {TenantId}. Migration may not have been applied.", tenantId);
                throw new Exception($"Bảng ZaloOARecipients chưa tồn tại trong database của trung tâm. Vui lòng liên hệ quản trị hệ thống để chạy migration.");
            }

            try
            {
                result.TotalRecipients = recipients.Count;

                if (recipients.Count == 0)
                {
                    return new SendZaloMessageResponse
                    {
                        Sent = 0,
                        Failed = 0,
                        TotalRecipients = 0,
                        Message = "Chưa có follower nào. Vui lòng đảm bảo users đã theo dõi Zalo OA qua webhook."
                    };
                }

                // Send messages
                foreach (var recipient in recipients)
                {
                    try
                    {
                        var zaloResponse = await SendZaloTextMessageAsync(accessToken, recipient.ZaloUserId, $"{request.Title}\n\n{request.Content}");

                        if (zaloResponse)
                            result.Sent++;
                        else
                            result.Failed++;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send Zalo message to {ZaloUserId}", recipient.ZaloUserId);
                        result.Failed++;
                        result.Errors.Add($"User {recipient.ZaloUserId}: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ZaloOARecipients table not found for tenant {TenantId}. Migration may not have been applied.", tenantId);
                throw new Exception($"Bảng ZaloOARecipients chưa tồn tại trong database của trung tâm. Vui lòng liên hệ quản trị hệ thống để chạy migration.");
            }

            // Save notification record
            var notification = new Notification
            {
                TenantId = tenantId,
                UserId = userId,
                Title = request.Title,
                Message = request.Content,
                Type = "Info",
                Category = "ZaloOA",
                ReferenceId = null,
                ReferenceType = "ZaloMessage",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            _tenantContext.Notifications.Add(notification);
            await _tenantContext.SaveChangesAsync();

            return result;
        }

        public async Task<List<ZaloOAFollowerResponse>> GetFollowersAsync(string tenantId)
        {
            try
            {
                var followers = await _tenantContext.ZaloOARecipients
                    .Where(r => r.IsFollowing)
                    .OrderByDescending(r => r.FollowedAt)
                    .ToListAsync();

                return followers.Select(f => new ZaloOAFollowerResponse
                {
                    Id = f.Id,
                    ZaloUserId = f.ZaloUserId,
                    IsFollowing = f.IsFollowing,
                    FollowedAt = f.FollowedAt
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ZaloOARecipients table not found for tenant {TenantId}", tenantId);
                return new List<ZaloOAFollowerResponse>();
            }
        }

        public async Task<List<ZaloMessageHistoryResponse>> GetMessageHistoryAsync(string tenantId)
        {
            var messages = await _tenantContext.Notifications
                .Where(n => n.TenantId == tenantId && n.Category == "ZaloOA")
                .OrderByDescending(n => n.CreatedAt)
                .Take(50)
                .ToListAsync();

            return messages.Select(m => new ZaloMessageHistoryResponse
            {
                NotificationId = m.NotificationId,
                Title = m.Title,
                Message = m.Message,
                Category = m.Category,
                CreatedAt = m.CreatedAt
            }).ToList();
        }

        // ============================
        // WEBHOOK
        // ============================

        public async Task HandleWebhookAsync(ZaloWebhookPayload payload)
        {
            // Lấy ID OA từ thuộc tính thông minh mới
            var webhookOAId = payload.ActualOAId;
            var zaloUserId = payload.ActualFollowerId;

            _logger.LogInformation("Webhook xử lý: OAId={0}, Event={1}, User={2}",
                webhookOAId, payload.EventName, zaloUserId);

            if (string.IsNullOrEmpty(webhookOAId))
            {
                _logger.LogWarning("Không tìm thấy OAId trong payload.");
                return;
            }

            // Bây giờ webhookOAId sẽ là "2359690496809826947" thay vì null
            var config = await _adminContext.TenantZaloOAConfigs
                .FirstOrDefaultAsync(c => c.AppId == webhookOAId || c.OAId == webhookOAId);

            if (config == null)
            {
                _logger.LogWarning("Không tìm thấy cấu hình cho OA: {OAId}", webhookOAId);
                return;
            }

            // 2. Chuyển sang DB Tenant (Logic cũ của bạn)
            await _tenantService.SetTenant(config.TenantId);
            if (!string.IsNullOrEmpty(_tenantService.ConnectionString))
            {
                // Đóng kết nối cũ để nhận ConnectionString mới
                if (_tenantContext.Database.GetDbConnection().State == System.Data.ConnectionState.Open)
                {
                    await _tenantContext.Database.CloseConnectionAsync();
                }
                _tenantContext.Database.SetConnectionString(_tenantService.ConnectionString);
            }

            // 3. Xử lý lưu DB (Phải thêm case user_send_text)
            switch (payload.EventName)
            {
                case "follow":
                case "user_follow":
                case "user_send_text": // Cần thêm để xử lý tin nhắn bạn vừa test
                    var existing = await _tenantContext.ZaloOARecipients
                        .FirstOrDefaultAsync(r => r.ZaloUserId == zaloUserId);

                    if (existing == null && !string.IsNullOrEmpty(zaloUserId))
                    {
                        _tenantContext.ZaloOARecipients.Add(new ZaloOARecipient
                        {
                            ZaloUserId = zaloUserId,
                            IsFollowing = true,
                            FollowedAt = DateTime.UtcNow
                        });
                        await _tenantContext.SaveChangesAsync();
                        _logger.LogInformation("Đã lưu User {0} vào DB của Tenant {1}", zaloUserId, config.TenantId);
                    }
                    break;

                case "unfollow":
                    // ... logic unfollow ...
                    break;
            }
        }

        // ============================
        // PRIVATE HELPERS
        // ============================

        private async Task<ZaloTokenResponse?> GetAccessTokenAsync(string oaId, string secretKey, string code)
        {
            try
            {
                var content = new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string, string>("app_id", oaId),
                    new KeyValuePair<string, string>("grant_type", "authorization_code"),
                    new KeyValuePair<string, string>("code", code)
                });

                var requestUrl = $"{ZALO_OAUTH_BASE}/oa/access_token";
                var encodedBody = await content.ReadAsStringAsync();

                _logger.LogInformation("=== Zalo OAuth Token Exchange ===");
                _logger.LogInformation("URL: {Url}", requestUrl);
                _logger.LogInformation("app_id: '{AppId}' (length: {Len}, isNumeric: {IsNum})", oaId, oaId?.Length ?? 0, long.TryParse(oaId, out _));
                _logger.LogInformation("secret_key length: {Len}, prefix: '{Prefix}'", secretKey?.Length ?? 0,
                    secretKey?.Length > 4 ? secretKey[..4] + "..." : secretKey);
                _logger.LogInformation("code length: {Len}, prefix: '{Prefix}'", code?.Length ?? 0,
                    code?.Length > 8 ? code[..8] + "..." : code);
                _logger.LogInformation("Encoded body: {Body}", encodedBody);
                _logger.LogInformation("Content-Type: {CT}", content.Headers.ContentType?.ToString());

                var httpClient = _httpClientFactory.CreateClient("ZaloAPI");
                var request = new HttpRequestMessage(HttpMethod.Post, requestUrl);
                request.Headers.Add("secret_key", secretKey);
                request.Content = content;

                var response = await httpClient.SendAsync(request);
                var json = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("Zalo API response status: {StatusCode}, body: {Body}",
                    (int)response.StatusCode, json);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Zalo API returned HTTP {StatusCode}: {Body}",
                        (int)response.StatusCode, json);

                    try
                    {
                        var errDoc = JsonDocument.Parse(json);
                        if (errDoc.RootElement.TryGetProperty("error", out var httpErr))
                        {
                            var httpErrMsg = errDoc.RootElement.TryGetProperty("message", out var hm) ? hm.GetString()
                                : errDoc.RootElement.TryGetProperty("error_description", out var hed) ? hed.GetString()
                                : json;
                            _logger.LogError("Zalo HTTP error detail: error={Error}, message={Message}", httpErr.GetInt32(), httpErrMsg);
                            return new ZaloTokenResponse { ErrorMessage = $"Zalo API error ({httpErr.GetInt32()}): {httpErrMsg}" };
                        }
                    }
                    catch { }

                    return new ZaloTokenResponse { ErrorMessage = $"Zalo API HTTP {(int)response.StatusCode}: {json}" };
                }

                var doc = JsonDocument.Parse(json);

                if (doc.RootElement.TryGetProperty("error", out var error) && error.GetInt32() != 0)
                {
                    var errorMsg = doc.RootElement.TryGetProperty("message", out var m) ? m.GetString()
                        : doc.RootElement.TryGetProperty("error_description", out var ed) ? ed.GetString()
                        : "Unknown error";
                    _logger.LogWarning("Zalo token error: error={Error}, message={Message}", error.GetInt32(), errorMsg);
                    return new ZaloTokenResponse { ErrorMessage = $"Zalo API error ({error.GetInt32()}): {errorMsg}" };
                }

                if (!doc.RootElement.TryGetProperty("access_token", out var accessTokenEl) || accessTokenEl.ValueKind == JsonValueKind.Null)
                {
                    _logger.LogWarning("Zalo response missing access_token. Full response: {Body}", json);
                    return null;
                }

                return new ZaloTokenResponse
                {
                    AccessToken = accessTokenEl.GetString(),
                    RefreshToken = doc.RootElement.TryGetProperty("refresh_token", out var rt) ? rt.GetString() : null,
                    ExpiresIn = ParseExpiresIn(doc.RootElement)
                };
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Network error calling Zalo API: {Message}", ex.Message);
                return null;
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError(ex, "Zalo API request timed out");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error getting Zalo access token: {Message}", ex.Message);
                return null;
            }
        }

        private async Task<string> EnsureAccessTokenAsync(TenantZaloOAConfig config)
        {
            if (config.TokenExpiresAt.HasValue && config.TokenExpiresAt.Value > DateTime.UtcNow.AddMinutes(5))
            {
                return Decrypt(config.EncryptedAccessToken!);
            }

            if (string.IsNullOrEmpty(config.EncryptedRefreshToken))
                throw new Exception("Zalo OA chưa cấp quyền hoặc refresh token không tồn tại. Vui lòng cấp quyền lại.");

            var secretKey = Decrypt(config.EncryptedSecretKey);
            var refreshToken = Decrypt(config.EncryptedRefreshToken);
            var tokenResponse = await RefreshTokenAsync(config.AppId, secretKey, refreshToken);

            if (tokenResponse == null)
                throw new Exception("Không thể kết nối đến Zalo API.");

            if (!string.IsNullOrEmpty(tokenResponse.ErrorMessage))
                throw new Exception($"Zalo từ chối: {tokenResponse.ErrorMessage}");

            if (string.IsNullOrEmpty(tokenResponse.AccessToken))
                throw new Exception("Không thể làm mới access token từ Zalo OA. Vui lòng cấp quyền lại.");

            config.EncryptedAccessToken = Encrypt(tokenResponse.AccessToken);
            if (tokenResponse.RefreshToken != null)
                config.EncryptedRefreshToken = Encrypt(tokenResponse.RefreshToken);
            config.TokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);
            config.UpdatedAt = DateTime.UtcNow;

            await _adminContext.SaveChangesAsync();

            return tokenResponse.AccessToken;
        }

        private async Task<ZaloTokenResponse?> RefreshTokenAsync(string appId, string secretKey, string refreshToken)
        {
            try
            {
                var content = new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string, string>("app_id", appId),
                    new KeyValuePair<string, string>("grant_type", "refresh_token"),
                    new KeyValuePair<string, string>("refresh_token", refreshToken)
                });

                var requestUrl = $"{ZALO_OAUTH_BASE}/oa/access_token";
                _logger.LogInformation("=== Zalo Refresh Token ===");
                _logger.LogInformation("URL: {Url}", requestUrl);
                _logger.LogInformation("app_id: {AppId}", appId);
                _logger.LogInformation("refresh_token length: {Len}", refreshToken?.Length ?? 0);

                var httpClient = _httpClientFactory.CreateClient("ZaloAPI");
                var request = new HttpRequestMessage(HttpMethod.Post, requestUrl);
                request.Headers.Add("secret_key", secretKey);
                request.Content = content;

                var response = await httpClient.SendAsync(request);
                var json = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("Zalo refresh token response status: {StatusCode}, body: {Body}",
                    (int)response.StatusCode, json);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Zalo refresh returned HTTP {StatusCode}: {Body}",
                        (int)response.StatusCode, json);

                    try
                    {
                        var errDoc = JsonDocument.Parse(json);
                        if (errDoc.RootElement.TryGetProperty("error", out var httpErr))
                        {
                            var httpErrMsg = errDoc.RootElement.TryGetProperty("message", out var hm) ? hm.GetString()
                                : errDoc.RootElement.TryGetProperty("error_description", out var hed) ? hed.GetString()
                                : json;
                            return new ZaloTokenResponse { ErrorMessage = $"Zalo API error ({httpErr.GetInt32()}): {httpErrMsg}" };
                        }
                    }
                    catch { }

                    return new ZaloTokenResponse { ErrorMessage = $"Zalo API HTTP {(int)response.StatusCode}: {json}" };
                }

                var doc = JsonDocument.Parse(json);

                if (doc.RootElement.TryGetProperty("error", out var error) && error.GetInt32() != 0)
                {
                    var errorMsg = doc.RootElement.TryGetProperty("message", out var m) ? m.GetString()
                        : doc.RootElement.TryGetProperty("error_description", out var ed) ? ed.GetString()
                        : "Unknown error";
                    _logger.LogWarning("Zalo refresh token error: error={Error}, message={Message}", error.GetInt32(), errorMsg);
                    return new ZaloTokenResponse { ErrorMessage = $"Zalo API error ({error.GetInt32()}): {errorMsg}" };
                }

                if (!doc.RootElement.TryGetProperty("access_token", out var accessTokenEl) || accessTokenEl.ValueKind == JsonValueKind.Null)
                {
                    _logger.LogWarning("Zalo refresh response missing access_token. Full response: {Body}", json);
                    return null;
                }

                return new ZaloTokenResponse
                {
                    AccessToken = accessTokenEl.GetString(),
                    RefreshToken = doc.RootElement.TryGetProperty("refresh_token", out var rt) ? rt.GetString() : null,
                    ExpiresIn = ParseExpiresIn(doc.RootElement)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing Zalo token: {Message}", ex.Message);
                return null;
            }
        }

        private async Task<bool> SendZaloTextMessageAsync(string accessToken, string zaloUserId, string message)
        {
            // 1. "Làm sạch" token: Đảm bảo không dính ký tự rác từ quá trình giải mã AES
            accessToken = accessToken?.Trim().TrimEnd('\0');

            if (string.IsNullOrEmpty(accessToken) || string.IsNullOrEmpty(zaloUserId))
            {
                _logger.LogWarning("Zalo Send: Thiếu AccessToken hoặc ZaloUserId");
                return false;
            }

            // 2. Chuẩn bị nội dung Body
            var body = new
            {
                recipient = new { user_id = zaloUserId },
                message = new { text = message }
            };

            // 3. Sửa URL: Bỏ tham số ?access_token=... khỏi URL
            // (Zalo v3.0 yêu cầu token nằm trong Header để bảo mật hơn)
            var url = $"{ZALO_API_BASE}/oa/message/cs";

            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
                };

                // 4. QUAN TRỌNG NHẤT: Đưa Token vào Header thay vì URL
                // Điều này giúp giải quyết lỗi "Access token must be placed in header"
                request.Headers.Add("access_token", accessToken);

                var httpClient = _httpClientFactory.CreateClient("ZaloAPI");
                var response = await httpClient.SendAsync(request);
                var json = await response.Content.ReadAsStringAsync();

                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("error", out var errorElement))
                {
                    int errorCode = errorElement.GetInt32();
                    if (errorCode != 0)
                    {
                        var errorMsg = doc.RootElement.TryGetProperty("message", out var m) ? m.GetString() : "Unknown error";

                        // Phân loại mã lỗi để log dễ hiểu hơn
                        string friendlyMessage = errorCode switch
                        {
                            -216 => "Token hết hạn hoặc sai định dạng Header. Hãy kiểm tra lại luồng Refresh.",
                            404 => "URL sai hoặc Endpoint không tồn tại.",
                            -212 => "Người dùng chưa nhắn tin cho OA trong 48h qua.",
                            -232 => "Hết hạn tương tác 48h (Người dùng cần chủ động nhắn lại cho OA).",
                            -224 => "Gói dịch vụ OA chưa được kích hoạt hoặc đã hết hạn.",
                            _ => errorMsg
                        };

                        _logger.LogWarning("Zalo send message failed: {Code} - {Msg}. Raw Response: {Json}",
                                            errorCode, friendlyMessage, json);
                        return false;
                    }
                }

                _logger.LogInformation("Zalo gửi tin nhắn thành công cho User: {UserId}", zaloUserId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi kết nối khi gọi API Zalo.");
                return false;
            }
        }

        private static int ParseExpiresIn(JsonElement root)
        {
            if (!root.TryGetProperty("expires_in", out var exp))
                return 3600;

            return exp.ValueKind switch
            {
                JsonValueKind.Number => exp.GetInt32(),
                JsonValueKind.String => int.TryParse(exp.GetString(), out var val) ? val : 3600,
                _ => 3600
            };
        }

        private ZaloOAConfigResponse MapToResponse(TenantZaloOAConfig config, string tenantName)
        {
            return new ZaloOAConfigResponse
            {
                Id = config.Id,
                TenantId = config.TenantId,
                TenantName = tenantName,
                AppId = config.AppId,
                OAId = config.OAId,
                IsActive = config.IsActive,
                WebhookVerified = config.WebhookVerified,
                TokenExpiresAt = config.TokenExpiresAt,
                CreatedAt = config.CreatedAt,
                UpdatedAt = config.UpdatedAt
            };
        }

        private string Encrypt(string plainText)
        {
            using var aes = Aes.Create();
            aes.Key = DeriveKey();
            aes.IV = new byte[16];

            using var encryptor = aes.CreateEncryptor();
            var plainBytes = Encoding.UTF8.GetBytes(plainText);
            var encryptedBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
            return Convert.ToBase64String(encryptedBytes);
        }

        private string Decrypt(string cipherText)
        {
            if (string.IsNullOrEmpty(cipherText)) return string.Empty;
            using var aes = Aes.Create();
            aes.Key = DeriveKey();
            aes.IV = new byte[16];
            aes.Padding = PaddingMode.PKCS7; // Xác định rõ Padding

            using var decryptor = aes.CreateDecryptor();
            var cipherBytes = Convert.FromBase64String(cipherText);
            var decryptedBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);

            // Trim để loại bỏ các ký tự rác phát sinh khi giải mã
            return Encoding.UTF8.GetString(decryptedBytes).TrimEnd('\0').Trim();
        }

        private byte[] DeriveKey()
        {
            using var sha = SHA256.Create();
            return sha.ComputeHash(Encoding.UTF8.GetBytes(_encryptionKey));
        }

        private class ZaloTokenResponse
        {
            public string? AccessToken { get; set; }
            public string? RefreshToken { get; set; }
            public int ExpiresIn { get; set; }
            public string? ErrorMessage { get; set; }
        }
    }
}