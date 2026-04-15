namespace EducenAPI.DTOs.ZaloOA
{
    public class ZaloMessageHistoryResponse
    {
        public int NotificationId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? Category { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
