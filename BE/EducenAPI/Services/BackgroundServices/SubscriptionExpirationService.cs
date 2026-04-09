using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace EducenAPI.Services.BackgroundServices
{
    /// <summary>
    /// Background service kiểm tra và gửi thông báo khi gói dịch vụ sắp hết hạn
    /// </summary>
    public class SubscriptionExpirationService : BackgroundService
    {
        private readonly ILogger<SubscriptionExpirationService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private static readonly int[] ScheduledHours = new[] { 8, 14 };

        // Số ngày trước khi hết hạn để gửi thông báo
        private const int DAYS_BEFORE_EXPIRY_WARNING = 7;
        private const int DAYS_BEFORE_EXPIRY_URGENT = 3;

        // TEST MODE - đặt = true để test với tất cả subscription active
        private const bool TEST_MODE = false;

        public SubscriptionExpirationService(
            ILogger<SubscriptionExpirationService> logger,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Subscription Expiration Service is starting.");

            // Chạy ngay khi start
            await CheckAndNotifyExpiringSubscriptionsAsync();

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var localNow = DateTime.Now;
                    var delay = GetDelayUntilNextScheduledRun(localNow);
                    var nextRun = localNow.Add(delay);

                    _logger.LogInformation("Next subscription expiration check scheduled at {NextRun}", nextRun);
                    await Task.Delay(delay, stoppingToken);

                    _logger.LogInformation("Running scheduled subscription expiration check at {Time}", DateTime.Now);
                    await CheckAndNotifyExpiringSubscriptionsAsync();
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while checking subscription expiration.");
                }
            }

            _logger.LogInformation("Subscription Expiration Service is stopping.");
        }

        private async Task CheckAndNotifyExpiringSubscriptionsAsync()
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var adminDbContext = scope.ServiceProvider.GetRequiredService<AdminDbContext>();

                var now = DateTime.UtcNow;
                var warningExpiryDate = now.AddDays(DAYS_BEFORE_EXPIRY_WARNING);
                var urgentExpiryDate = now.AddDays(DAYS_BEFORE_EXPIRY_URGENT);

                // Lấy danh sách các gói đang active và sắp hết hạn
                var expiringSubscriptions = await adminDbContext.Subscriptions
                    .Include(s => s.Tenant)
                    .Include(s => s.Plan)
                    .Where(s => s.Status == "Active" 
                        && s.EndDate > now 
                        && s.EndDate <= warningExpiryDate)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} subscriptions expiring in the next {Days} days",
                    expiringSubscriptions.Count, DAYS_BEFORE_EXPIRY_WARNING);

                foreach (var subscription in expiringSubscriptions)
                {
                    try
                    {
                        var daysRemaining = Math.Max((subscription.EndDate.Date - now.Date).Days, 0);
                        var isUrgent = daysRemaining <= DAYS_BEFORE_EXPIRY_URGENT;

                        // Gửi thông báo vào tenant database
                        await SendNotificationToTenantAsync(
                            adminDbContext,
                            subscription.Tenant,
                            subscription,
                            daysRemaining,
                            isUrgent,
                            now);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to process notification for tenant {TenantId}",
                            subscription.TenantId);
                    }
                }

                _logger.LogInformation("Completed subscription expiration check. Processed {Count} subscriptions",
                    expiringSubscriptions.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to check expiring subscriptions");
            }
        }

        private static TimeSpan GetDelayUntilNextScheduledRun(DateTime localNow)
        {
            var nextRun = ScheduledHours
                .Select(hour => new DateTime(localNow.Year, localNow.Month, localNow.Day, hour, 0, 0, DateTimeKind.Local))
                .FirstOrDefault(candidate => candidate > localNow);

            if (nextRun == default)
            {
                var firstScheduledHourTomorrow = ScheduledHours.Min();
                nextRun = new DateTime(localNow.Year, localNow.Month, localNow.Day, firstScheduledHourTomorrow, 0, 0, DateTimeKind.Local)
                    .AddDays(1);
            }

            var delay = nextRun - localNow;
            return delay > TimeSpan.Zero ? delay : TimeSpan.FromSeconds(1);
        }

        private async Task SendNotificationToTenantAsync(
            AdminDbContext adminDbContext,
            Tenant tenant,
            Subscription subscription,
            int daysRemaining,
            bool isUrgent,
            DateTime utcNow)
        {
            if (string.IsNullOrEmpty(tenant.ConnectionString))
            {
                _logger.LogWarning("Tenant {TenantId} has no connection string, skipping notification",
                    tenant.TenantId);
                return;
            }

            var notificationTitle = isUrgent 
                ? "⚠️ Gói Dịch Vụ Sắp Hết Hạn - Gia Hạn Ngay!" 
                : "📢 Thông Báo: Gói Dịch Vụ Sắp Hết Hạn";
            
            var notificationMessage = isUrgent
                ? $"Gói dịch vụ \"{subscription.Plan.PlanName}\" của trung tâm sẽ hết hạn sau {daysRemaining} ngày (ngày {subscription.EndDate:dd/MM/yyyy}). " +
                  $"Vui lòng gia hạn ngay để tránh gián đoạn dịch vụ."
                : $"Gói dịch vụ \"{subscription.Plan.PlanName}\" của trung tâm sẽ hết hạn sau {daysRemaining} ngày (ngày {subscription.EndDate:dd/MM/yyyy}). " +
                  $"Vui lòng liên hệ quản trị viên hệ thống để gia hạn.";

            try
            {
                // Tạo scope riêng cho tenant database
                using var tenantScope = _serviceProvider.CreateScope();
                var tenantDbContext = tenantScope.ServiceProvider.GetRequiredService<EducenV2Context>();
                
                tenantDbContext.Database.SetConnectionString(tenant.ConnectionString);
                tenantDbContext.Database.SetCommandTimeout(5);

                var recipientUserIds = await ResolveRecipientUserIdsAsync(tenantDbContext);
                if (recipientUserIds.Count == 0)
                {
                    _logger.LogWarning("No recipient user found for tenant {TenantId}, skipping in-app notification",
                        tenant.TenantId);
                }
                else
                {
                    var startOfDayUtc = utcNow.Date;
                    var endOfDayUtc = startOfDayUtc.AddDays(1);
                    var notificationMarker = $"sau {daysRemaining} ngày";

                    var existingRecipientIds = await tenantDbContext.Notifications
                        .Where(n =>
                            n.TenantId == tenant.TenantId &&
                            recipientUserIds.Contains(n.UserId) &&
                            n.Category == "Subscription" &&
                            n.ReferenceType == "Subscription" &&
                            n.ReferenceId == subscription.Id.ToString() &&
                            n.CreatedAt >= startOfDayUtc &&
                            n.CreatedAt < endOfDayUtc &&
                            n.Message.Contains(notificationMarker))
                        .Select(n => n.UserId)
                        .Distinct()
                        .ToListAsync();

                    var pendingRecipientIds = recipientUserIds
                        .Except(existingRecipientIds)
                        .ToList();

                    if (pendingRecipientIds.Count == 0)
                    {
                        _logger.LogInformation(
                            "Skip duplicate in-app notification for tenant {TenantId}, subscription {SubscriptionId}, daysRemaining {DaysRemaining}",
                            tenant.TenantId,
                            subscription.Id,
                            daysRemaining);
                    }
                    else
                    {
                        var notifications = pendingRecipientIds.Select(userId => new Models.Notification
                        {
                            TenantId = tenant.TenantId,
                            UserId = userId,
                            Title = notificationTitle,
                            Message = notificationMessage,
                            Type = isUrgent ? "Warning" : "Info",
                            Category = "Subscription",
                            ReferenceId = subscription.Id.ToString(),
                            ReferenceType = "Subscription",
                            IsRead = false,
                            CreatedAt = utcNow
                        }).ToList();

                        tenantDbContext.Notifications.AddRange(notifications);
                        await tenantDbContext.SaveChangesAsync();

                        _logger.LogInformation(
                            "Saved {Count} in-app notifications for tenant {TenantId} - subscription expiring in {Days} days",
                            notifications.Count, tenant.TenantId, daysRemaining);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save in-app notification for tenant {TenantId}: {Message}",
                    tenant.TenantId, ex.Message);
            }

            // Gửi thông báo qua Zalo OA nếu đã cấu hình
            await TrySendZaloOANotificationAsync(adminDbContext, tenant, subscription, notificationTitle, notificationMessage, daysRemaining);
        }

        private static async Task<List<int>> ResolveRecipientUserIdsAsync(EducenV2Context tenantDbContext)
        {
            var adminUserIds = await tenantDbContext.Users
                .Where(u => u.RoleId == 1 && u.AccountStatus == "Active")
                .OrderBy(u => u.UserId)
                .Select(u => u.UserId)
                .ToListAsync();

            if (adminUserIds.Count > 0)
                return adminUserIds;

            var activeUserIds = await tenantDbContext.Users
                .Where(u => u.AccountStatus == "Active")
                .OrderBy(u => u.UserId)
                .Select(u => u.UserId)
                .ToListAsync();

            if (activeUserIds.Count > 0)
                return activeUserIds;

            return await tenantDbContext.Users
                .OrderBy(u => u.UserId)
                .Select(u => u.UserId)
                .Take(1)
                .ToListAsync();
        }

        private async Task TrySendZaloOANotificationAsync(
            AdminDbContext adminDbContext,
            Tenant tenant,
            Subscription subscription,
            string title,
            string message,
            int daysRemaining)
        {
            try
            {
                // Lấy cấu hình Zalo OA của tenant
                var zaloConfig = await adminDbContext.TenantZaloOAConfigs
                    .FirstOrDefaultAsync(c => c.TenantId == tenant.TenantId && c.IsActive);

                if (zaloConfig == null)
                {
                    _logger.LogDebug("Tenant {TenantId} has no active Zalo OA config, skipping Zalo notification",
                        tenant.TenantId);
                    return;
                }

                // Lấy access token
                var accessToken = await EnsureZaloAccessTokenAsync(zaloConfig);
                if (string.IsNullOrEmpty(accessToken))
                {
                    _logger.LogWarning("Cannot get Zalo access token for tenant {TenantId}", tenant.TenantId);
                    return;
                }

                // Lấy danh sách admin/manager của tenant để gửi tin nhắn
                using var tenantScope = _serviceProvider.CreateScope();
                var tenantDbContext = tenantScope.ServiceProvider.GetRequiredService<EducenV2Context>();
                tenantDbContext.Database.SetConnectionString(tenant.ConnectionString);
                tenantDbContext.Database.SetCommandTimeout(5);

                // Tìm user có role Admin (RoleId = 1)
                var adminUsers = await tenantDbContext.Users
                    .Where(u => u.RoleId == 1)
                    .Take(5)
                    .ToListAsync();

                if (!adminUsers.Any())
                {
                    _logger.LogWarning("No admin users found for tenant {TenantId}", tenant.TenantId);
                    return;
                }

                // Gửi tin nhắn qua Zalo OA (nếu bảng tồn tại)
                var httpClient = _serviceProvider.GetRequiredService<IHttpClientFactory>().CreateClient("ZaloAPI");
                List<string> zaloRecipients = new();
                
                try
                {
                    zaloRecipients = await tenantDbContext.ZaloOARecipients
                        .Where(r => r.IsFollowing)
                        .Select(r => r.ZaloUserId)
                        .ToListAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "ZaloOARecipients table not found or query failed, skipping Zalo notification");
                    // Tiếp tục mà không gửi Zalo
                }

                int sentCount = 0;
                foreach (var zaloUserId in zaloRecipients)
                {
                    try
                    {
                        var zaloMessage = $"{title}\n\n{message}";
                        var success = await SendZaloMessageAsync(httpClient, accessToken, zaloUserId, zaloMessage);
                        if (success) sentCount++;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to send Zalo message to user {UserId}", zaloUserId);
                    }
                }

                _logger.LogInformation(
                    "Sent {Count} Zalo OA notifications to tenant {TenantId} - subscription expiring in {Days} days",
                    sentCount, tenant.TenantId, daysRemaining);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send Zalo OA notification to tenant {TenantId}: {Message}",
                    tenant.TenantId, ex.Message);
            }
        }

        private async Task<string?> EnsureZaloAccessTokenAsync(Models.TenantZaloOAConfig config)
        {
            try
            {
                if (config.TokenExpiresAt.HasValue && config.TokenExpiresAt.Value > DateTime.UtcNow.AddMinutes(5))
                {
                    // Giải mã access token
                    using var aes = System.Security.Cryptography.Aes.Create();
                    aes.Key = DeriveKey(config.EncryptedSecretKey ?? "EducenDefaultKey");
                    aes.IV = new byte[16];
                    using var decryptor = aes.CreateDecryptor();
                    var cipherBytes = Convert.FromBase64String(config.EncryptedAccessToken!);
                    var decryptedBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
                    return System.Text.Encoding.UTF8.GetString(decryptedBytes);
                }

                // Cần refresh token
                if (string.IsNullOrEmpty(config.EncryptedRefreshToken))
                    return null;

                // Giải mã secret key và refresh token
                string secretKey = DecryptWithDerivedKey(config.EncryptedSecretKey ?? "EducenDefaultKey", config.EncryptedSecretKey!);
                string refreshToken = DecryptWithDerivedKey(config.EncryptedSecretKey ?? "EducenDefaultKey", config.EncryptedRefreshToken!);

                var httpClient = _serviceProvider.GetRequiredService<IHttpClientFactory>().CreateClient("ZaloAPI");
                var tokenResponse = await RefreshZaloTokenAsync(httpClient, config.OAId!, secretKey, refreshToken);
                
                if (tokenResponse == null || string.IsNullOrEmpty(tokenResponse.AccessToken))
                    return null;

                // Cập nhật token mới
                config.EncryptedAccessToken = EncryptWithDerivedKey(config.EncryptedSecretKey ?? "EducenDefaultKey", tokenResponse.AccessToken);
                if (tokenResponse.RefreshToken != null)
                    config.EncryptedRefreshToken = EncryptWithDerivedKey(config.EncryptedSecretKey ?? "EducenDefaultKey", tokenResponse.RefreshToken);
                config.TokenExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);
                config.UpdatedAt = DateTime.UtcNow;
                
                using var scope = _serviceProvider.CreateScope();
                var adminDbContext = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
                await adminDbContext.SaveChangesAsync();

                return tokenResponse.AccessToken;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to ensure Zalo access token");
                return null;
            }
        }

        private async Task<bool> SendZaloMessageAsync(HttpClient httpClient, string accessToken, string zaloUserId, string message)
        {
            try
            {
                var body = new
                {
                    recipient = new { user_id = zaloUserId },
                    message = new { text = message }
                };

                var request = new HttpRequestMessage(HttpMethod.Post, "https://openapi.zalo.me/v2.0/oa/message/cs");
                request.Headers.Add("access_token", accessToken);
                request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

                var response = await httpClient.SendAsync(request);
                var json = await response.Content.ReadAsStringAsync();
                var doc = JsonDocument.Parse(json);

                if (doc.RootElement.TryGetProperty("error", out var error) && error.GetInt32() != 0)
                {
                    var msg = doc.RootElement.TryGetProperty("message", out var m) ? m.GetString() : "Unknown error";
                    _logger.LogWarning("Zalo send message error: {Error} - {Message}", error.GetInt32(), msg);
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send Zalo message to {ZaloUserId}", zaloUserId);
                return false;
            }
        }

        private async Task<ZaloTokenResult?> RefreshZaloTokenAsync(HttpClient httpClient, string appId, string secretKey, string refreshToken)
        {
            try
            {
                refreshToken = refreshToken?.Trim().TrimEnd('\0');

                var content = new FormUrlEncodedContent(new[]
                {
                new KeyValuePair<string, string>("app_id", appId),
                    new KeyValuePair<string, string>("grant_type", "refresh_token"),
                    new KeyValuePair<string, string>("refresh_token", refreshToken)
                });

                var request = new HttpRequestMessage(HttpMethod.Post, "https://oauth.zalo.me/v4/oa/access_token");
                request.Headers.Add("secret_key", secretKey);
                request.Content = content;

                var response = await httpClient.SendAsync(request);
                var json = await response.Content.ReadAsStringAsync();
                var doc = JsonDocument.Parse(json);

                if (doc.RootElement.TryGetProperty("error", out var error) && error.GetInt32() != 0)
                {
                    var msg = doc.RootElement.TryGetProperty("message", out var m) ? m.GetString() : "Unknown error";
                    _logger.LogWarning("Zalo refresh token error: {Error} - {Message}", error.GetInt32(), msg);
                    return null;
                }

                var accessToken = doc.RootElement.TryGetProperty("access_token", out var at) ? at.GetString() : null;
                var refresh = doc.RootElement.TryGetProperty("refresh_token", out var rt) ? rt.GetString() : null;
                var expiresIn = doc.RootElement.TryGetProperty("expires_in", out var exp) ? exp.GetInt32() : 3600;

                return new ZaloTokenResult { AccessToken = accessToken, RefreshToken = refresh, ExpiresIn = expiresIn };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to refresh Zalo token");
                return null;
            }
        }

        private byte[] DeriveKey(string encryptionKey)
        {
            using var sha = System.Security.Cryptography.SHA256.Create();
            return sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(encryptionKey));
        }

        private string EncryptWithDerivedKey(string key, string plainText)
        {
            using var aes = System.Security.Cryptography.Aes.Create();
            aes.Key = DeriveKey(key);
            aes.IV = new byte[16];
            using var encryptor = aes.CreateEncryptor();
            var plainBytes = System.Text.Encoding.UTF8.GetBytes(plainText);
            var encryptedBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
            return Convert.ToBase64String(encryptedBytes);
        }

        private string DecryptWithDerivedKey(string key, string cipherText)
        {
            using var aes = System.Security.Cryptography.Aes.Create();
            aes.Key = DeriveKey(key);
            aes.IV = new byte[16];
            using var decryptor = aes.CreateDecryptor();
            var cipherBytes = Convert.FromBase64String(cipherText);
            var decryptedBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
            return System.Text.Encoding.UTF8.GetString(decryptedBytes);
        }

        private class ZaloTokenResult
        {
            public string? AccessToken { get; set; }
            public string? RefreshToken { get; set; }
            public int ExpiresIn { get; set; }
        }
    }
}
