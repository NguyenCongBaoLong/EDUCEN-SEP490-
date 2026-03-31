namespace EducenAPI.DTOs.SupportRequestDTOs
{
    public class SupportRequestResponseDto
    {
        public int Id { get; set; }
        public int SenderId { get; set; }
        public string SenderName { get; set; }
        public int? ReceiverId { get; set; }
        public string? ReceiverName { get; set; }
        public string Title { get; set; }
        public string Content { get; set; }
        public string Status { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? AdminResponse { get; set; }
        public DateTime? RespondedAt { get; set; }
    }
}
