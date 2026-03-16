using EducenAPI.DTOs.FileUpload;
using EducenAPI.Services.Interface;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace EducenAPI.Services
{
    public class UploadFileService : IFileUploadService
    {
        public async Task<List<FileUploadDto>> UploadResourceFile(IFormFileCollection files)
        {
            try
            {
                var results = new List<FileUploadDto>();
                if(files == null || files.Count == 0)
                {
                    throw new Exception("The selected file had been not found.");
                }
                var date = DateTime.Now.ToString("yyyyMMdd");
                foreach (var file in files)
                {
                    if(file == null && file.Length == 0)
                    {
                        throw new Exception("Uploaded file is empty!");
                    }
                    var extension = Path.GetExtension(file.FileName)
                                        .Replace(".", "")
                                        .ToLower();

                    var directoryPath = Path.Combine("wwwroot/uploads", "files", date);
                    if (!Directory.Exists(directoryPath))
                    {
                        Directory.CreateDirectory(directoryPath);
                    }

                    var id = Guid.NewGuid();

                    var fileName = $"{id}_{Path.GetFileName(file.FileName)}";
                    var filePath = Path.Combine(directoryPath, fileName);
                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await file.CopyToAsync(stream);
                    }
                    var dbPath = Path.Combine("files", date, fileName).Replace("\\", "/");

                    if (string.IsNullOrEmpty(filePath)) throw new Exception("Failed to upload file");

                    var dto = new FileUploadDto
                    {
                        ContentType = file.ContentType,
                        Extension = extension,
                        FileName = fileName,
                        FilePath = filePath,
                        FileSize = file.Length / 1024,                        
                    };

                    results.Add(dto);
                }
                return results;
            }
            catch(Exception ex)
            {
                throw;
            }
        }
    }
}
