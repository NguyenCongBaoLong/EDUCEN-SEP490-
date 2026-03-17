namespace EducenAPI.DTOs.LessionMaterials
{
    public class MaterialResponseDto
    {
        public int MaterialId { get; set; }
        public int? SessionId { get; set; }
        public int? ClassId { get; set; }
        public string? Title { get; set; }
        public string? FileUrl { get; set; } 
        public string? ContentType { get; set; } 
        public long? FileSize { get; set; }
        public string? OriginalFileName { get; set; }
    }
}
