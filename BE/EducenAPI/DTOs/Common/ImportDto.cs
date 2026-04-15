namespace EducenAPI.DTOs.Common
{
    public class ImportDto
    {
        public int SourceId { get; set; }
        public int TargetSessionId { get; set; }
        public System.DateTime? EndTime { get; set; }
    }
}
