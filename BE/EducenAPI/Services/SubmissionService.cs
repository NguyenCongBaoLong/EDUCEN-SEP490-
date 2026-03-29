using EducenAPI.DTOs.Submissions;
using EducenAPI.Enums;
using EducenAPI.Exceptions;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class SubmissionService : ISubmissionService
    {
        private readonly EducenV2Context _context;
        private readonly IFileUploadService _fileService;
        public SubmissionService(EducenV2Context context, IFileUploadService fileService)
        {
            _context = context;
            _fileService = fileService;
        }

        public async Task<SubmissionResponseDto> CreateSubmissionAsync(CreateSubmissionRequest request, string baseUrl)
        {
            string fileUrl = string.Empty;

            var assignment = await _context.Assignments.FindAsync(request.AsmId);
            if (assignment == null)
                throw new Exception("Không tìm thấy bài tập");

            if (assignment.StartTime.HasValue && DateTime.Now < assignment.StartTime.Value)
            {
                throw new Exception("Bài tập này chưa mở");
            }
            var student = await _context.Students.FindAsync(request.StudentId);
            if (student == null)
                throw new Exception("Không tìm thấy học sinh");

            var existing = await _context.Submissions
                .FirstOrDefaultAsync(x => x.AsmId == request.AsmId && x.StudentId == request.StudentId);

            if (existing != null)
                throw new Exception("Bài nộp đã tồn tại");
            if (!string.IsNullOrEmpty(request.FileUrl))
            {
                fileUrl = request.FileUrl;
            }
            if(request.File != null)
            {

                var files = new FormFileCollection { request.File };
                var uploadedFiles = await _fileService.UploadResourceFile(files);
                var uploadedFile = uploadedFiles.FirstOrDefault();
                if (uploadedFile != null) fileUrl = uploadedFile.FilePath;
            }
            var now = DateTime.Now;

            var status = SubmissionStatus.Submitted;

            if (assignment.EndTime.HasValue && now > assignment.EndTime.Value)
            {
                status = SubmissionStatus.LateSubmitted;
            }

            var submission = new Submission
            {
                AsmId = request.AsmId,
                StudentId = request.StudentId,
                FileUrl = fileUrl,
                SubmittedAt = now,
                Status = status,
                IsPublished = false
            };

            _context.Submissions.Add(submission);
            await _context.SaveChangesAsync();

            return MapToResponseDto(submission, baseUrl);
        }

        public async Task<SubmissionResponseDto> UpdateSubmissionAsync(int subId, UpdateSubmissionRequest request, string baseUrl)
        {
            string fileUrl = string.Empty;
            var submission = await _context.Submissions
                .Include(x => x.Asm)
                .FirstOrDefaultAsync(x => x.SubId == subId);

            if (submission == null)
                throw new Exception("Không tìm thấy bài nộp");

            if (submission.Score != null || submission.Status == "Graded" || submission.Status == "Published" || submission.IsPublished)
                throw new Exception("Không thể cập nhật bài nộp vì nó đã được chấm hoặc công khai.");

            if (!string.IsNullOrEmpty(request.FileUrl))
            {
                fileUrl = request.FileUrl;
                submission.FileUrl = fileUrl;
            }
            if (request.File != null)
            {

                var files = new FormFileCollection { request.File };
                var uploadedFiles = await _fileService.UploadResourceFile(files);
                var uploadedFile = uploadedFiles.FirstOrDefault();
                if (uploadedFile != null) fileUrl = uploadedFile.FilePath;
                submission.FileUrl = fileUrl;
            }


            var now = DateTime.Now;
            submission.SubmittedAt = now;
            submission.Status = SubmissionStatus.Submitted;

            if (submission.Asm.EndTime.HasValue && now > submission.Asm.EndTime.Value)
            {
                submission.Status = SubmissionStatus.LateSubmitted;
            }

            submission.Score = null;
            submission.TeacherComment = null;
            submission.GradedAt = null;
            submission.IsPublished = false;

            await _context.SaveChangesAsync();
            return MapToResponseDto(submission, baseUrl);
        }

        public async Task<SubmissionResponseDto> GradeSubmissionAsync(int subId, GradeSubmissionRequest request, string baseUrl)
        {
            var submission = await _context.Submissions
                .FirstOrDefaultAsync(x => x.SubId == subId);

            if (submission == null)
                throw new Exception("Không tìm thấy bài nộp");

            if (string.IsNullOrWhiteSpace(submission.FileUrl))
                throw new Exception("Không thể chấm điểm vì không tìm thấy file bài làm");

            submission.Score = request.Score;
            submission.TeacherComment = request.TeacherComment;
            submission.GradedAt = DateTime.Now;
            submission.Status = "Graded";

            await _context.SaveChangesAsync();
            return MapToResponseDto(submission, baseUrl);
        }

        public async Task<SubmissionResponseDto> PublishGradeAsync(int subId, bool isPublished, string baseUrl)
        {
            var submission = await _context.Submissions
                .FirstOrDefaultAsync(x => x.SubId == subId);

            if (submission == null)
                throw new Exception("Không tìm thấy bài nộp");

            if (submission.Score == null)
                throw new Exception("Không thể công khai điểm trước khi chấm điểm");

            submission.IsPublished = isPublished;
            submission.Status = isPublished ? "Published" : "Unpublished";

            await _context.SaveChangesAsync();
            return MapToResponseDto(submission, baseUrl);
        }

        public async Task<SubmissionResponseDto> ResetSubmissionAsync(int subId, string baseUrl)
        {
            var submission = await _context.Submissions
                .Include(x => x.Asm)
                .FirstOrDefaultAsync(x => x.SubId == subId);

            if (submission == null)
                throw new Exception("Không tìm thấy bài nộp");

            submission.Score = null;
            submission.TeacherComment = null;
            submission.GradedAt = null;
            submission.IsPublished = false;
            
            await _context.SaveChangesAsync();
            return MapToResponseDto(submission, baseUrl);
        }

        public async Task<SubmissionResponseDto?> GetByIdAsync(int subId, string baseUrl)
        {
            var submission = await _context.Submissions
                .Include(x => x.Student)
                .Include(x => x.Asm)
                .FirstOrDefaultAsync(x => x.SubId == subId);
            
            return submission != null ? MapToResponseDto(submission, baseUrl) : null;
        }

        public async Task<bool> PublishAllGradesAsync(int assignmentId, bool isPublished)
        {
            var submissions = await _context.Submissions
                .Where(x => x.AsmId == assignmentId && x.Score != null)
                .ToListAsync();

            if (!submissions.Any())
                return false;

            foreach (var sub in submissions)
            {
                sub.IsPublished = isPublished;
                sub.Status = isPublished ? "Published" : "Graded";
            }

            await _context.SaveChangesAsync();
            return true;
        }

        private SubmissionResponseDto MapToResponseDto(Submission submission, string baseUrl)
        {
            return new SubmissionResponseDto
            {
                SubId = submission.SubId,
                AsmId = submission.AsmId,
                StudentId = submission.StudentId,
                FileUrl = !string.IsNullOrEmpty(submission.FileUrl)
                    ? $"{baseUrl}/{submission.FileUrl.Replace("\\", "/").Replace("wwwroot/", "")}"
                    : null,
                SubmittedAt = submission.SubmittedAt,
                Status = submission.Status,
                Score = submission.Score,
                TeacherComment = submission.TeacherComment,
                GradedAt = submission.GradedAt,
                IsPublished = submission.IsPublished
            };
        }
    }
}
