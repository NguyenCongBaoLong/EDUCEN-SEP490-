namespace EducenAPI.DTOs.ZaloOA
{
    public class SendZaloMessageResponse
    {
        public int TotalRecipients { get; set; }
        public int Sent { get; set; }
        public int Failed { get; set; }
        public List<string> Errors { get; set; } = new();
    }
}
