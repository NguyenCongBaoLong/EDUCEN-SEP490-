namespace EducenAPI.Models
{
    public class ResourceFile
    {
        public int Id { get; set; }

        public string FileName { get; set; }

        public string ContentType { get; set; }

        public string FilePath { get; set; } = string.Empty;

        public string Extension { get; set; } = string.Empty;

        public long? FileSize { get; set; }

        public int? LessonMaterialId { get; set; }

        public int? AssignmentId { get; set; }

        public Assignment? Assignment { get; set; }

        public LessonMaterial? LessonMaterial { get; set; }
    }
}
