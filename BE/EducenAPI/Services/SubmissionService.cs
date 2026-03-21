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

        public async Task<Submission> CreateSubmissionAsync(CreateSubmissionRequest request)
        {
            string fileUrl = string.Empty;
            var assignment = await _context.Assignments.FindAsync(request.AsmId);
            if (assignment == null)
                throw new Exception("Assignment not found");

            var student = await _context.Students.FindAsync(request.StudentId);
            if (student == null)
                throw new Exception("Student not found");

            var existing = await _context.Submissions
                .FirstOrDefaultAsync(x => x.AsmId == request.AsmId && x.StudentId == request.StudentId);

            if (existing != null)
                throw new Exception("Submission already exists, use update API");
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

            return submission;
        }

        public async Task<Submission> UpdateSubmissionAsync(int subId, UpdateSubmissionRequest request)
        {
            string fileUrl = string.Empty;
            var submission = await _context.Submissions
                .Include(x => x.Asm)
                .FirstOrDefaultAsync(x => x.SubId == subId);

            if (submission == null)
                throw new Exception("Submission not found");
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


            var now = DateTime.UtcNow;
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
            return submission;
        }

        public async Task<Submission> GradeSubmissionAsync(int subId, GradeSubmissionRequest request)
        {
            var submission = await _context.Submissions
                .FirstOrDefaultAsync(x => x.SubId == subId);

            if (submission == null)
                throw new Exception("Submission not found");

            if (string.IsNullOrWhiteSpace(submission.FileUrl))
                throw new Exception("Cannot grade because no file was submitted");

            submission.Score = request.Score;
            submission.TeacherComment = request.TeacherComment;
            submission.GradedAt = DateTime.UtcNow;
            submission.Status = "Graded";

            await _context.SaveChangesAsync();
            return submission;
        }

        public async Task<Submission> PublishGradeAsync(int subId, bool isPublished)
        {
            var submission = await _context.Submissions
                .FirstOrDefaultAsync(x => x.SubId == subId);

            if (submission == null)
                throw new Exception("Submission not found");

            if (submission.Score == null)
                throw new Exception("Cannot publish grade before grading");

            submission.IsPublished = isPublished;
            submission.Status = isPublished ? "Published" : "Unpublished";

            await _context.SaveChangesAsync();
            return submission;
        }

        public async Task<Submission?> GetByIdAsync(int subId)
        {
            return await _context.Submissions
                .Include(x => x.Student)
                .Include(x => x.Asm)
                .FirstOrDefaultAsync(x => x.SubId == subId);
        }
    }
}
