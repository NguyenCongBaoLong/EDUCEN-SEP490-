namespace EducenAPI.DTOs.ZaloOA
{
    public class ZaloOAStatusResponse
    {
        public bool IsConfigured { get; set; }
        public bool IsActive { get; set; }
        public string? OAId { get; set; }
        public int FollowerCount { get; set; }
        public DateTime? TokenExpiresAt { get; set; }
        public bool IsTokenExpired { get; set; }
    }
}
