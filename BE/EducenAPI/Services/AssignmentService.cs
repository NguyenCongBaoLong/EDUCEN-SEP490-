using EducenAPI.DTOs.Assignments;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class AssignmentService : IAssignmentService
    {
        private readonly EducenV2Context _context;
        private readonly IFileUploadService _fileService;

        public AssignmentService(EducenV2Context context, IFileUploadService fileService)
        {
            _context = context;
            _fileService = fileService;
        }

        public async Task<Assignment> CreateAssignmentAsync(CreateAssignmentDto dto)
        {
            string? fileUrl = null;

            if (dto.File != null)
            {
                var files = new FormFileCollection
            {
                dto.File
            };

                var uploadedFiles = await _fileService.UploadResourceFile(files);
                var uploadedFile = uploadedFiles.FirstOrDefault();

                if (uploadedFile != null)
                {
                    fileUrl = uploadedFile.FilePath;
                }
            }

            var assignment = new Assignment
            {
                ClassId = dto.ClassId,
                Title = dto.Title,
                Description = dto.Description,
                FileUrl = fileUrl,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime
            };

            _context.Assignments.Add(assignment);
            await _context.SaveChangesAsync();

            return assignment;
        }
    }
}
