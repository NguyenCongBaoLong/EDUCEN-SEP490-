using EducenAPI.DTOs.ZaloOA;
using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface IZaloOANotificationService
    {
        // === System Admin ===
        Task<ZaloOAConfigResponse> SetupConfigAsync(string tenantId, SetupZaloOARequest request);
        Task<ZaloOAConfigResponse?> GetConfigAsync(string tenantId);
        Task<List<ZaloOAConfigResponse>> GetAllConfigsAsync();
        Task<bool> DeleteConfigAsync(string tenantId);
        Task<bool> VerifyConnectionAsync(string tenantId);
        Task<object> TestCredentialsAsync(string tenantId);
        string GetAuthorizationUrl(string tenantId);
        Task<bool> HandleOAuthCallbackAsync(string tenantId, string code);

        // === Tenant Admin ===
        Task<ZaloOAStatusResponse> GetStatusAsync(string tenantId);
        Task<SendZaloMessageResponse> SendBatchMessageAsync(string tenantId, int userId, SendZaloMessageRequest request);
        Task<List<ZaloOAFollowerResponse>> GetFollowersAsync(string tenantId);
        Task<List<ZaloMessageHistoryResponse>> GetMessageHistoryAsync(string tenantId);

        // === Webhook ===
        Task HandleWebhookAsync(ZaloWebhookPayload payload);
    }

    public class ZaloWebhookPayload
    {
        public string EventName { get; set; } = string.Empty;
        public string OAId { get; set; } = string.Empty;
        public string? FollowerId { get; set; }
        public string? UserId { get; set; }
        public string? Message { get; set; }
        public long Timestamp { get; set; }
    }
}
