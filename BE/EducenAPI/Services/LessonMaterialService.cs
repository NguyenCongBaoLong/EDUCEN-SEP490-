using EducenAPI.DTOs.FileUpload;
using EducenAPI.DTOs.LessionMaterials;
using EducenAPI.Exceptions;
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
        private readonly IUserContextService _userServiceContext;
        public LessonMaterialService(EducenV2Context context, IFileUploadService fileService, IUserContextService userServiceContext)
        {
            _context = context;
            _fileService = fileService;
            _userServiceContext = userServiceContext;
        }

        private void CreateResourceFileForMaterial(LessonMaterial material, string fileName, string contentType, string extension, string filePath, long fileSize)
        {
            var rf = new ResourceFile
            {
                FileName = fileName,
                ContentType = contentType,
                Extension = extension,
                FilePath = filePath,
                FileSize = fileSize,
                LessonMaterialId = material.MaterialId,
            };
            _context.ResourceFiles.Add(rf);
        }

        private async Task CleanupFileAsync(string? fileUrl)
        {
            if (string.IsNullOrEmpty(fileUrl)) return;

            var otherRefs = await _context.ResourceFiles
                .AnyAsync(rf => rf.FilePath == fileUrl);

            if (!otherRefs)
            {
                string normalizedPath = fileUrl.Replace("/", Path.DirectorySeparatorChar.ToString())
                                              .Replace("\\", Path.DirectorySeparatorChar.ToString());
                if (!normalizedPath.StartsWith("wwwroot" + Path.DirectorySeparatorChar))
                    normalizedPath = Path.Combine("wwwroot", normalizedPath);

                if (File.Exists(normalizedPath))
                    File.Delete(normalizedPath);
            }
        }

        private async Task DeleteResourceFilesForMaterialAsync(int materialId)
        {
            var resourceFiles = await _context.ResourceFiles
                .Where(rf => rf.LessonMaterialId == materialId)
                .ToListAsync();

            foreach (var rf in resourceFiles)
            {
                await CleanupFileAsync(rf.FilePath);
                _context.ResourceFiles.Remove(rf);
            }
        }
        public async Task<MaterialResponseDto> SaveMaterials(SaveMaterialDto dto, string baseUrl)
        {
            if (dto.SessionId.HasValue)
            {
               
                var sessionExists = await _context.ClassSessions.AnyAsync(s => s.SessionId == dto.SessionId.Value);
                if (!sessionExists)
                {
                    throw new BadRequestException("SessionId không tồn tại trong hệ thống.");
                }
            }
            string? fileUrl = null;
            string? contentType = null;
            var userId = _userServiceContext.GetUserId();

            FileUploadDto? uploadedFileDto = null;
            if (dto.GradeId != null)
            {
                var isExistedGrading = await _context.Grades.AnyAsync(e => e.GradeId == dto.GradeId);
                if (!isExistedGrading)
                {
                    throw new BadRequestException("Grade không hợp lệ");
                }
            }
            if (dto.File != null)
            {
                if (dto.File.Length == 0)
                {
                    throw new BadRequestException("File tải lên không được rỗng (0MB).");
                }
                string originalFileName = dto.File.FileName;

                // Check duplicate by OriginalFileName
                if (dto.SessionId.HasValue)
                {
                    var existingNames = await _context.LessonMaterials
                        .Where(m => m.SessionId == dto.SessionId && !string.IsNullOrEmpty(m.FileUrl))
                        .Select(m => m.FileUrl)
                        .ToListAsync();
                    bool isDuplicate = existingNames.Any(url => NormalizeFileName(GetOriginalFileNameFromUrl(url)) == NormalizeFileName(originalFileName));
                    if (isDuplicate)
                        throw new ConflictException("File này đã tồn tại trong buổi học này.");
                }
                
                // Always check library for duplicate OriginalFileName
                var existingLibraryNames = await _context.LessonMaterials
                    .Where(m => m.SessionId == null && m.UserId == userId && !string.IsNullOrEmpty(m.FileUrl))
                    .Select(m => m.FileUrl)
                    .ToListAsync();
                bool isLibDuplicate = existingLibraryNames.Any(url => NormalizeFileName(GetOriginalFileNameFromUrl(url)) == NormalizeFileName(originalFileName));
                if (isLibDuplicate)
                    throw new BadRequestException("File tài liệu này đã tồn tại trong thư viện. Vui lòng chọn từ thư viện.");

                var files = new FormFileCollection { dto.File };
                var uploadedFiles = await _fileService.UploadResourceFile(files);
                uploadedFileDto = uploadedFiles.FirstOrDefault();
                if (uploadedFileDto != null)
                {
                    fileUrl = uploadedFileDto.FilePath;
                    contentType = uploadedFileDto.ContentType;
                }
            }

            var isTitleUnique = await _context.LessonMaterials.AnyAsync(e => dto.SessionId != null 
                    && dto.SessionId == e.SessionId
                    && e.Title == dto.Title);
            if (isTitleUnique)
                throw new ConflictException("Tiêu đề đang bị trùng");
            var material = new LessonMaterial
            {
                SessionId = dto.SessionId,
                Title = dto.Title,
                FileUrl = fileUrl,
                ContentType = contentType,
                UserId = userId,
                GradeId = dto.GradeId
            };
            _context.LessonMaterials.Add(material);
            await _context.SaveChangesAsync();

            // Create ResourceFile record if file was uploaded
            if (uploadedFileDto != null)
            {
                CreateResourceFileForMaterial(material,
                    uploadedFileDto.FileName,
                    uploadedFileDto.ContentType,
                    uploadedFileDto.Extension,
                    uploadedFileDto.FilePath,
                    uploadedFileDto.FileSize ?? 0);
            }

            if (dto.SaveToLibrary && dto.SessionId.HasValue)
            {
                var existsInLib = await _context.LessonMaterials
                    .AnyAsync(m => m.SessionId == null && m.UserId == userId 
                              && m.Title == material.Title && m.FileUrl == material.FileUrl);
                
                if (!existsInLib)
                {
                    var libraryMaterial = new LessonMaterial
                    {
                        SessionId = null,
                        Title = material.Title,
                        FileUrl = material.FileUrl,
                        ContentType = material.ContentType,
                        UserId = userId,
                        GradeId = material.GradeId
                    };
                    _context.LessonMaterials.Add(libraryMaterial);
                    await _context.SaveChangesAsync();

                    // Create ResourceFile for library copy (same physical file)
                    if (uploadedFileDto != null)
                    {
                        CreateResourceFileForMaterial(libraryMaterial,
                            uploadedFileDto.FileName,
                            uploadedFileDto.ContentType,
                            uploadedFileDto.Extension,
                            uploadedFileDto.FilePath,
                            uploadedFileDto.FileSize ?? 0);
                    }
                }
            }

            return MapToResponseDto(material, baseUrl);
        }

        private MaterialResponseDto MapToResponseDto(LessonMaterial material, string baseUrl)
        {
            return new MaterialResponseDto
            {
                MaterialId = material.MaterialId,
                SessionId = material.SessionId,
                GradeId = material.GradeId,
                Title = material.Title,
                ContentType = material.ContentType,
                FileUrl = !string.IsNullOrEmpty(material.FileUrl)
                    ? $"{baseUrl}/{material.FileUrl.Replace("\\", "/").Replace("wwwroot/", "")}"
                    : null,
                FileSize = GetFileSizeFromUrl(material.FileUrl),
                OriginalFileName = GetOriginalFileNameFromUrl(material.FileUrl)
            };
        }

        public async Task<MaterialResponseDto> UpdateMaterialAsync(int id, SaveMaterialDto dto, string baseUrl)
        {
            var material = await _context.LessonMaterials.FindAsync(id);
            if (material == null)
                throw new Exception("Không tìm thấy tài liệu");

            FileUploadDto? uploadedFileDto = null;
            string? oldFileUrl = material.FileUrl;

            if (dto.File != null)
            {
                if (dto.File.Length == 0)
                {
                    throw new BadRequestException("File tải lên không được rỗng (0MB).");
                }
                string newOriginalFileName = dto.File.FileName;

                // Check duplicate in session (exclude current material), by filename only
                if (material.SessionId.HasValue)
                {
                    var existingNames = await _context.LessonMaterials
                        .Where(m => m.SessionId == material.SessionId && m.MaterialId != id && !string.IsNullOrEmpty(m.FileUrl))
                        .Select(m => m.FileUrl)
                        .ToListAsync();
                    bool isDuplicate = existingNames.Any(url => NormalizeFileName(GetOriginalFileNameFromUrl(url)) == NormalizeFileName(newOriginalFileName));
                    if (isDuplicate)
                        throw new ConflictException("File này đã tồn tại trong buổi học này.");
                }

                var files = new FormFileCollection { dto.File };
                var uploadedFiles = await _fileService.UploadResourceFile(files);
                uploadedFileDto = uploadedFiles.FirstOrDefault();
                if (uploadedFileDto != null)
                {
                    material.FileUrl = uploadedFileDto.FilePath;
                    material.ContentType = uploadedFileDto.ContentType;
                }

                // Delete old ResourceFile records for this material
                var oldResourceFiles = await _context.ResourceFiles
                    .Where(rf => rf.LessonMaterialId == id)
                    .ToListAsync();
                foreach (var rf in oldResourceFiles)
                {
                    _context.ResourceFiles.Remove(rf);
                }
            }

            material.Title = dto.Title;
            material.SessionId = dto.SessionId;
            material.GradeId = dto.GradeId;

            // Save to library if requested and not already exists
            if (dto.SaveToLibrary)
            {
                var userId = _userServiceContext.GetUserId();
                var existsInLib = await _context.LessonMaterials
                    .AnyAsync(m => m.SessionId == null && m.UserId == userId 
                              && m.Title == material.Title && m.FileUrl == material.FileUrl);
                
                if (!existsInLib)
                {
                    var libraryMaterial = new LessonMaterial
                    {
                        SessionId = null,
                        Title = material.Title,
                        FileUrl = material.FileUrl,
                        ContentType = material.ContentType,
                        UserId = userId,
                        GradeId = material.GradeId
                    };
                    _context.LessonMaterials.Add(libraryMaterial);
                }
            }

            await _context.SaveChangesAsync();

            // Create ResourceFile record if new file was uploaded
            if (uploadedFileDto != null)
            {
                CreateResourceFileForMaterial(material,
                    uploadedFileDto.FileName,
                    uploadedFileDto.ContentType,
                    uploadedFileDto.Extension,
                    uploadedFileDto.FilePath,
                    uploadedFileDto.FileSize ?? 0);
            }

            // Clean up old physical file if no other ResourceFile references it
            if (dto.File != null && !string.IsNullOrEmpty(oldFileUrl))
            {
                await CleanupFileAsync(oldFileUrl);
            }

            return MapToResponseDto(material, baseUrl);
        }

        public async Task<LessonMaterial> UploadMaterials(UploadMaterialDto dto)
        {
            var material = await _context.LessonMaterials
            .FirstOrDefaultAsync(x => x.MaterialId == dto.MaterialId);

            if (material == null)
                throw new Exception("Không tìm thấy tài liệu");

            if (dto.File.Length == 0)
            {
                throw new BadRequestException("File tải lên không được rỗng (0MB).");
            }
            string newOriginalFileName = dto.File.FileName;

            // Check duplicate by filename only (size check broken in Docker)
            if (material.SessionId.HasValue)
            {
                var existingNames = await _context.LessonMaterials
                    .Where(m => m.SessionId == material.SessionId && m.MaterialId != dto.MaterialId && !string.IsNullOrEmpty(m.FileUrl))
                    .Select(m => m.FileUrl)
                    .ToListAsync();
                bool isDuplicate = existingNames.Any(url => NormalizeFileName(GetOriginalFileNameFromUrl(url)) == NormalizeFileName(newOriginalFileName));
                if (isDuplicate)
                    throw new ConflictException("File này đã tồn tại trong buổi học này.");
            }
            else
            {
                var userId = _userServiceContext.GetUserId();
                var existingNames = await _context.LessonMaterials
                    .Where(m => m.SessionId == null && m.UserId == userId && m.MaterialId != dto.MaterialId && !string.IsNullOrEmpty(m.FileUrl))
                    .Select(m => m.FileUrl)
                    .ToListAsync();
                bool isDuplicate = existingNames.Any(url => NormalizeFileName(GetOriginalFileNameFromUrl(url)) == NormalizeFileName(newOriginalFileName));
                if (isDuplicate)
                    throw new ConflictException("File này đã tồn tại trong thư viện.");
            }

            var files = new FormFileCollection
            {
                dto.File
            };

            var uploadedFiles = await _fileService.UploadResourceFile(files);
            var uploadedFile = uploadedFiles.FirstOrDefault();

            if (uploadedFile == null)
                throw new Exception("Tải tệp lên thất bại");

            string? oldFileUrl = material.FileUrl;

            material.FileUrl = uploadedFile.FilePath;
            material.ContentType = uploadedFile.ContentType;

            // Delete old ResourceFile records for this material
            var oldResourceFiles = await _context.ResourceFiles
                .Where(rf => rf.LessonMaterialId == dto.MaterialId)
                .ToListAsync();
            foreach (var rf in oldResourceFiles)
            {
                _context.ResourceFiles.Remove(rf);
            }

            await _context.SaveChangesAsync();

            // Create new ResourceFile record
            CreateResourceFileForMaterial(material,
                uploadedFile.FileName,
                uploadedFile.ContentType,
                uploadedFile.Extension,
                uploadedFile.FilePath,
                uploadedFile.FileSize ?? 0);
            await _context.SaveChangesAsync();

            // Clean up old physical file if no other ResourceFile references it
            if (!string.IsNullOrEmpty(oldFileUrl))
            {
                await CleanupFileAsync(oldFileUrl);
            }

            return material;
        }

        public async Task<List<MaterialResponseDto>> GetMaterialsBySessionAsync(int sessionId, string baseUrl)
        {
            var rawMaterials = await _context.LessonMaterials
                .Where(x => x.SessionId == sessionId)
                .ToListAsync();

            var materials = rawMaterials.Select(x => new MaterialResponseDto
                {
                    MaterialId = x.MaterialId,
                    SessionId = x.SessionId,
                    GradeId = x.GradeId,
                    Title = x.Title,
                    ContentType = x.ContentType,
                    FileUrl = !string.IsNullOrEmpty(x.FileUrl)
                        ? $"{baseUrl}/{x.FileUrl.Replace("\\", "/").Replace("wwwroot/", "")}"
                        : null,
                    FileSize = GetFileSizeFromUrl(x.FileUrl),
                    OriginalFileName = GetOriginalFileNameFromUrl(x.FileUrl)                 
                })
                .ToList();

            return materials;
        }
        public async Task<List<MaterialResponseDto>> GetAllMaterialsAsync(string baseUrl)
        {
            var userId = _userServiceContext.GetUserId();
            var rawMaterials = await _context.LessonMaterials
                .Where(x => x.SessionId == null && x.UserId == userId) 
                .ToListAsync();

            return rawMaterials
                .Select(x => MapToResponseDto(x, baseUrl))
                .ToList();
        }

        public async Task<LessonMaterial> ImportMaterialAsync(int materialId, int sessionId)
        {
            var source = await _context.LessonMaterials.FindAsync(materialId);
            if (source == null) throw new BadRequestException("Không tìm thấy tài liệu nguồn trong thư viện.");

            // Validate session exists
            var sessionExists = await _context.ClassSessions.AnyAsync(s => s.SessionId == sessionId);
            if (!sessionExists) throw new BadRequestException($"Buổi học với ID {sessionId} không tồn tại.");

            var userId = _userServiceContext.GetUserId();
            string sourceOriginalName = GetOriginalFileNameFromUrl(source.FileUrl);

            // Check duplicate by filename only (no DB size column needed)
            if (!string.IsNullOrEmpty(sourceOriginalName))
            {
                var existingNames = await _context.LessonMaterials
                    .Where(m => m.SessionId == sessionId && !string.IsNullOrEmpty(m.FileUrl))
                    .Select(m => m.FileUrl)
                    .ToListAsync();
                bool isDuplicate = existingNames.Any(url => NormalizeFileName(GetOriginalFileNameFromUrl(url)) == NormalizeFileName(sourceOriginalName));
                if (isDuplicate)
                    throw new ConflictException("File này đã tồn tại trong buổi học này.");
            }
            else
            {
                // Fallback: same FileUrl (same blob)
                bool isDuplicate = await _context.LessonMaterials
                    .AnyAsync(m => m.SessionId == sessionId && m.FileUrl == source.FileUrl);
                if (isDuplicate)
                    throw new ConflictException("File này đã tồn tại trong buổi học này.");
            }

            var material = new LessonMaterial
            {
                SessionId = sessionId,
                Title = source.Title,
                FileUrl = source.FileUrl,
                ContentType = source.ContentType,
                UserId = userId,
                GradeId = source.GradeId
            };

            _context.LessonMaterials.Add(material);
            await _context.SaveChangesAsync();

            // Create ResourceFile for imported material (references same physical file)
            if (!string.IsNullOrEmpty(source.FileUrl))
            {
                var rf = new ResourceFile
                {
                    FileName = Path.GetFileName(source.FileUrl),
                    ContentType = source.ContentType,
                    Extension = Path.GetExtension(source.FileUrl)?.TrimStart('.'),
                    FilePath = source.FileUrl,
                    FileSize = GetFileSizeFromUrl(source.FileUrl),
                    LessonMaterialId = material.MaterialId,
                };
                _context.ResourceFiles.Add(rf);
                await _context.SaveChangesAsync();
            }

            return material;
        }

        private string GetOriginalFileNameFromUrl(string? url)
        {
            if (string.IsNullOrEmpty(url)) return "";
            // Normalize path for cross-platform support
            string normalizedUrl = url.Replace("\\", "/");
            var fileName = Path.GetFileName(normalizedUrl);
            if (fileName.Contains('_'))
            {
                return fileName.Substring(fileName.IndexOf('_') + 1);
            }
            return fileName;
        }

        // Chuẩn hóa tên file để so sánh chính xác (space → underscore, lowercase)
        private string NormalizeFileName(string? fileName)
        {
            if (string.IsNullOrEmpty(fileName)) return "";
            return Path.GetFileName(fileName).Replace(" ", "_").ToLower();
        }

        private long GetFileSizeFromUrl(string? url)
        {
            if (string.IsNullOrEmpty(url)) return 0;
            
            // Normalize slashes and remove wwwroot prefix if present
            string normalizedPath = url.Replace("/", Path.DirectorySeparatorChar.ToString())
                                      .Replace("\\", Path.DirectorySeparatorChar.ToString());
            
            if (normalizedPath.StartsWith("wwwroot" + Path.DirectorySeparatorChar))
            {
                // It's already relative to the app root or absolute starting with wwwroot
            }
            else
            {
                normalizedPath = Path.Combine("wwwroot", normalizedPath);
            }

            if (File.Exists(normalizedPath))
            {
                return new FileInfo(normalizedPath).Length;
            }
            return 0;
        }

        public async Task<bool> DeleteMaterialAsync(int id)
        {
            var material = await _context.LessonMaterials.FindAsync(id);
            if (material == null) return false;

            await DeleteResourceFilesForMaterialAsync(id);

            _context.LessonMaterials.Remove(material);
            await _context.SaveChangesAsync();

            // Clean up physical file if no other ResourceFile references it
            await CleanupFileAsync(material.FileUrl);

            return true;
        }
    }
}
