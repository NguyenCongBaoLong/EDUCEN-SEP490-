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
        [JsonPropertyName("event_name")]
        public string? EventName { get; set; }

        [JsonPropertyName("oa_id")] // Dùng cho sự kiện 'follow'
        public string? OAId { get; set; }

        [JsonPropertyName("recipient")] // Dùng cho sự kiện 'user_send_text'
        public ZaloIdData? Recipient { get; set; }

        [JsonPropertyName("sender")] // Chứa ID người dùng khi nhắn tin
        public ZaloIdData? Sender { get; set; }

        [JsonPropertyName("follower")] // Chứa ID người dùng khi nhấn Quan tâm
        public ZaloIdData? Follower { get; set; }

        // THUỘC TÍNH THÔNG MINH: Tự động lấy OA ID chuẩn
        public string? ActualOAId => OAId ?? Recipient?.Id;

        // THUỘC TÍNH THÔNG MINH: Tự động lấy User ID chuẩn
        public string? ActualFollowerId => Sender?.Id ?? Follower?.Id;
    }

    public class ZaloIdData
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }
    }
}
