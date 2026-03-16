using EducenAPI.DTOs.FileUpload;

namespace EducenAPI.Services.Interface
{
    public interface IFileUploadService
    {
        Task<List<FileUploadDto>> UploadResourceFile(IFormFileCollection files);
    }
}
