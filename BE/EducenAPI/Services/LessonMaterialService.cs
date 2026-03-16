using EducenAPI.DTOs.FileUpload;
using EducenAPI.DTOs.LessionMaterials;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class LessonMaterialService : ILessonMaterialService
    {
        private readonly EducenV2Context _context;
        private readonly IFileUploadService _fileService;
        public LessonMaterialService(EducenV2Context context, IFileUploadService fileService)
        {
            _context = context;
            _fileService = fileService;
        }
        public async Task<LessonMaterial> SaveMaterials(SaveMaterialDto dto)
        {
            var material = new LessonMaterial
            {
                SessionId = dto.SessionId,
                Title = dto.Title
            };

            _context.LessonMaterials.Add(material);
            await _context.SaveChangesAsync();

            return material;
        }

        public async Task<LessonMaterial> UploadMaterials(UploadMaterialDto dto)
        {
            var material = await _context.LessonMaterials
            .FirstOrDefaultAsync(x => x.MaterialId == dto.MaterialId);

            if (material == null)
                throw new Exception("Material not found");

            var files = new FormFileCollection
            {
                dto.File
            };

            var uploadedFiles = await _fileService.UploadResourceFile(files);
            var uploadedFile = uploadedFiles.FirstOrDefault();

            if (uploadedFile == null)
                throw new Exception("Upload file failed");

            material.FileUrl = uploadedFile.FilePath;
            material.ContentType = uploadedFile.ContentType;

            await _context.SaveChangesAsync();

            return material;
        }

        public async Task<List<MaterialResponseDto>> GetMaterialsBySessionAsync(int sessionId, string baseUrl)
        {
            var materials = await _context.LessonMaterials
                .Where(x => x.SessionId == sessionId)
                .Select(x => new MaterialResponseDto
                {
                    MaterialId = x.MaterialId,
                    SessionId = x.SessionId ,
                    Title = x.Title,
                    ContentType = x.ContentType,
                    // Xử lý link file tương tự Assignment
                    FileUrl = !string.IsNullOrEmpty(x.FileUrl)
                        ? $"{baseUrl}/{x.FileUrl.Replace("wwwroot/", "").Replace("wwwroot\\", "").Replace("\\", "/")}"
                        : null
                })
                .ToListAsync();

            return materials;
        }
    }
}
