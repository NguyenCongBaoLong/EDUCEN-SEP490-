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
        private readonly IPaymentReminderService _notificationService;
        private readonly IUserContextService _userContextService;
        public SubmissionService(EducenV2Context context, IFileUploadService fileService, IPaymentReminderService notificationService, IUserContextService userContextService)
        {
            _context = context;
            _fileService = fileService;
            _notificationService = notificationService;
            _userContextService = userContextService;
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

        public async Task<SubmissionResponseDto> CreateSubmissionAsync(CreateSubmissionRequest request, string baseUrl)
        {
            string fileUrl = string.Empty;

            var assignment = await _context.Assignments
                .Include(a => a.Session)
                    .ThenInclude(s => s.Class)
                .FirstOrDefaultAsync(a => a.AsmId == request.AsmId);
            if (assignment == null)
                throw new Exception("Không tìm thấy bài tập");

            if (assignment.StartTime.HasValue && DateTime.Now < assignment.StartTime.Value)
            {
                throw new Exception("Bài tập này chưa mở");
            }

            // Check if assignment has ended and handle late submission logic
            var now = DateTime.Now;
            bool isLate = false;
            if (assignment.EndTime.HasValue && now > assignment.EndTime.Value)
            {
                // If late submission is not allowed, reject
                if (!assignment.AllowLateSubmission)
                {
                    throw new Exception("Đã hết hạn nộp bài. Giáo viên không cho phép nộp muộn.");
                }

                isLate = true;
            }
            var student = await _context.Students
                .Include(s => s.StudentNavigation)
                .FirstOrDefaultAsync(s => s.UserId == request.StudentId);
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

            var status = isLate ? SubmissionStatus.LateSubmitted : SubmissionStatus.Submitted;

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

            var classId = assignment.Session?.ClassId;
            if (classId.HasValue)
            {
                await _notificationService.SendToClassTeachersAsync(classId.Value, new CreateRoleNotificationRequest
                {
                    TenantId = _context.CurrentTenantId,
                    Title = "Bài nộp mới",
                    Message = $"{student.StudentNavigation?.FullName} đã nộp bài: {assignment.Title}.",
                    Type = "Info",
                    Category = "Submission",
                    ReferenceId = submission.SubId.ToString(),
                    ReferenceType = "Submission"
                });
            }

            await _notificationService.CreateSystemNotificationAsync(new CreateNotificationRequest
            {
                TenantId = _context.CurrentTenantId,
                UserId = request.StudentId,
                TargetRole = "Student",
                StudentId = request.StudentId,
                Title = "Đã nộp bài",
                Message = $"Bạn đã nộp bài: {assignment.Title}.",
                Type = "Success",
                Category = "Submission",
                ReferenceId = submission.SubId.ToString(),
                ReferenceType = "Submission",
                IsInApp = true
            });

            return MapToResponseDto(submission, baseUrl);
        }

        public async Task<SubmissionResponseDto> UpdateSubmissionAsync(int subId, UpdateSubmissionRequest request, string baseUrl)
        {
            string fileUrl = string.Empty;
            var submission = await _context.Submissions
                .Include(x => x.Asm)
                    .ThenInclude(a => a.Session)
                .FirstOrDefaultAsync(x => x.SubId == subId);

            if (submission == null)
                throw new Exception("Không tìm thấy bài nộp");

            if (submission.Score != null || submission.Status == "Graded" || submission.Status == "Published" || submission.IsPublished)
                throw new Exception("Không thể cập nhật bài nộp vì nó đã được chấm hoặc công khai.");

            // Check if assignment has ended and handle late submission logic for update
            var now = DateTime.Now;
            bool isLateUpdate = false;
            if (submission.Asm.EndTime.HasValue && now > submission.Asm.EndTime.Value)
            {
                // If late submission is not allowed, reject
                if (!submission.Asm.AllowLateSubmission)
                {
                    throw new Exception("Đã hết hạn nộp bài. Giáo viên không cho phép nộp muộn.");
                }

                isLateUpdate = true;
            }

            string? oldFileUrl = submission.FileUrl;

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

            submission.SubmittedAt = DateTime.Now;
            submission.Status = isLateUpdate ? SubmissionStatus.LateSubmitted : SubmissionStatus.Submitted;

            submission.Score = null;
            submission.TeacherComment = null;
            submission.GradedAt = null;
            submission.IsPublished = false;

            await _context.SaveChangesAsync();

            // Clean up old physical file if replaced
            if (request.File != null && !string.IsNullOrEmpty(oldFileUrl) && oldFileUrl != fileUrl)
            {
                await CleanupFileAsync(oldFileUrl);
            }

            var classId = submission.Asm.Session?.ClassId;
            if (classId.HasValue)
            {
                await _notificationService.SendToClassTeachersAsync(classId.Value, new CreateRoleNotificationRequest
                {
                    TenantId = _context.CurrentTenantId,
                    Title = "Bài nộp đã được cập nhật",
                    Message = $"Học sinh đã cập nhật bài: {submission.Asm.Title}.",
                    Type = "Info",
                    Category = "Submission",
                    ReferenceId = submission.SubId.ToString(),
                    ReferenceType = "Submission"
                });
            }

            await _notificationService.CreateSystemNotificationAsync(new CreateNotificationRequest
            {
                TenantId = _context.CurrentTenantId,
                UserId = submission.StudentId,
                TargetRole = "Student",
                StudentId = submission.StudentId,
                Title = "Đã cập nhật bài nộp",
                Message = $"Bạn đã cập nhật bài: {submission.Asm.Title}.",
                Type = "Info",
                Category = "Submission",
                ReferenceId = submission.SubId.ToString(),
                ReferenceType = "Submission",
                IsInApp = true
            });

            return MapToResponseDto(submission, baseUrl);
        }

        public async Task<SubmissionResponseDto> GradeSubmissionAsync(int subId, GradeSubmissionRequest request, string baseUrl)
        {
            var submission = await _context.Submissions
                .FirstOrDefaultAsync(x => x.SubId == subId);

            if (submission == null)
                throw new NotFoundException("Không tìm thấy bài nộp");

            if (string.IsNullOrWhiteSpace(submission.FileUrl))
                throw new Exception("Không thể chấm điểm vì không tìm thấy file bài làm");

            var userId = _userContextService.GetUserId();

            var isBelongOfTeacher = await _context.Assignments.AnyAsync(e => e.Submissions.Any(x=>x.AsmId==e.AsmId)&&e.UserId==userId);

            if (!isBelongOfTeacher)
            {
                throw new BadRequestException("Bạn không thể chấm điểm vì bài này không thuộc về bạn");
            }
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
                .Include(s => s.Student)
                    .ThenInclude(st => st.StudentNavigation)
                .Include(s => s.Asm)
                    .ThenInclude(a => a.Session)
                        .ThenInclude(sess => sess.Class)
                .FirstOrDefaultAsync(x => x.SubId == subId);

            if (submission == null)
                throw new NotFoundException("Không tìm thấy bài nộp");

            if (submission.Score == null)
                throw new Exception("Không thể công khai điểm trước khi chấm điểm");

            submission.IsPublished = isPublished;
            submission.Status = isPublished ? "Published" : "Unpublished";

            await _context.SaveChangesAsync();

            if (isPublished)
            {
                await _notificationService.SendToStudentAndParentsAsync(submission.StudentId, new CreateRoleNotificationRequest
                {
                    TenantId = _context.CurrentTenantId,
                    Title = "Điểm đã được công khai",
                    Message = $"Điểm bài {submission.Asm?.Title} đã được công khai.",
                    Type = "Success",
                    Category = "Grade",
                    ReferenceId = submission.SubId.ToString(),
                    ReferenceType = "Submission"
                });
            }

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
                .Include(s => s.Student)
                    .ThenInclude(st => st.StudentNavigation)
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

            if (isPublished)
            {
                var assignment = await _context.Assignments
                    .FirstOrDefaultAsync(a => a.AsmId == assignmentId);

                foreach (var sub in submissions)
                {
                    await _notificationService.SendToStudentAndParentsAsync(sub.StudentId, new CreateRoleNotificationRequest
                    {
                        TenantId = _context.CurrentTenantId,
                        Title = "Điểm đã được công khai",
                        Message = $"Điểm bài {assignment?.Title} đã được công khai.",
                        Type = "Success",
                        Category = "Grade",
                        ReferenceId = sub.SubId.ToString(),
                        ReferenceType = "Submission"
                    });
                }
            }
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
