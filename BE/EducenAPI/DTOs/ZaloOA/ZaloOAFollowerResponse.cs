namespace EducenAPI.DTOs.ZaloOA
{
    public class ZaloOAFollowerResponse
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string? UserName { get; set; }
        public string ZaloUserId { get; set; } = string.Empty;
        public bool IsFollowing { get; set; }
        public DateTime? FollowedAt { get; set; }
    }
}
