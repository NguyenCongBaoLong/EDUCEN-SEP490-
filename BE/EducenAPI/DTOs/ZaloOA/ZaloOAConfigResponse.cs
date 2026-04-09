namespace EducenAPI.DTOs.ZaloOA
{
    public class ZaloOAConfigResponse
    {
        public int Id { get; set; }
        public string TenantId { get; set; } = string.Empty;
        public string TenantName { get; set; } = string.Empty;
        public string AppId { get; set; } = string.Empty;
        public string? OAId { get; set; }
        public bool IsActive { get; set; }
        public bool WebhookVerified { get; set; }
        public DateTime? TokenExpiresAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
