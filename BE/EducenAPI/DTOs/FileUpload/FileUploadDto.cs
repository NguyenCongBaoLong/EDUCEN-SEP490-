namespace EducenAPI.DTOs.FileUpload
{
    public class FileUploadDto
    {
        public string FileName { get; set; }

        public string ContentType { get; set; }

        public string FilePath { get; set; } = string.Empty;

        public string Extension { get; set; } = string.Empty;

        public long? FileSize { get; set; }

    }
}
