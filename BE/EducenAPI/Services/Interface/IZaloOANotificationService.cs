using EducenAPI.DTOs.ZaloOA;
using EducenAPI.Models;
using System.Text.Json.Serialization;

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
        [JsonPropertyName("challenge")]
        public string? Challenge { get; set; }

        [JsonPropertyName("event_name")]
        public string? EventName { get; set; }

        [JsonPropertyName("oa_id")]
        public string? OAId { get; set; }

        // Tr??ng này th??ng không có ? c?p ngoài cùng trong s? ki?n 'follow'
        [JsonPropertyName("follower_id")]
        public string? FollowerIdRaw { get; set; }

        [JsonPropertyName("user_id")]
        public string? UserId { get; set; }

        [JsonPropertyName("timestamp")]
        public long Timestamp { get; set; }

        // ??I T??NG QUAN TR?NG NH?T
        [JsonPropertyName("follower")]
        public FollowerData? Follower { get; set; }

        // Thêm thu?c tính này ?? code x? lý bên d??i g?n h?n
        // và ?? Console log hi?n ?úng ID thay vì ?? tr?ng
        public string? FollowerId => Follower?.Id ?? FollowerIdRaw;
    }

    public class FollowerData
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }
    }
}
