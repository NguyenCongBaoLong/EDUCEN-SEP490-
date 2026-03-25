using EducenAPI.DTOs.Assignments;
using EducenAPI.Exceptions;
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
        private readonly IUserContextService _userContextService;
        public AssignmentService(EducenV2Context context, IFileUploadService fileService, IUserContextService userContextService)
        {
            _context = context;
            _fileService = fileService;
            _userContextService = userContextService;
        }

        public async Task<AssignmentResponseDto> CreateAssignmentAsync(CreateAssignmentDto dto, string baseUrl)
        {
            if (dto.StartTime.HasValue && dto.StartTime.Value < DateTime.Now)
            {
                // Có thể cho phép độ trễ vài phút (ví dụ < DateTime.Now.AddMinutes(-5)) nếu cần thiết,
                // nhưng khắt khe nhất thì dùng < DateTime.Now
                throw new BadRequestException("Thời gian bắt đầu không được ở trong quá khứ.");
            }
            //  Validate StartTime > EndTime
            if (dto.StartTime.HasValue && dto.EndTime.HasValue && dto.StartTime > dto.EndTime)
            {
                throw new BadRequestException("Thời gian bắt đầu không được lớn hơn thời gian kết thúc.");
            }

            //  Validate SessionId có tồn tại trong database hay không
            if (dto.SessionId.HasValue)
            {
                // Lưu ý: Đổi _context.Sessions thành tên DbSet tương ứng trong DbContext của bạn nếu khác
                var sessionExists = await _context.ClassSessions.AnyAsync(s => s.SessionId == dto.SessionId.Value);
                if (!sessionExists)
                {
                    throw new BadRequestException("SessionId không tồn tại trong hệ thống.");
                }
            }

            string? fileUrl = null;
            var userId = _userContextService.GetUserId();

            if (dto.File != null)
            {
                // Validate File = 0MB
                if (dto.File.Length == 0)
                {
                    throw new BadRequestException("File tải lên không được rỗng (0MB).");
                }

                string originalFileName = dto.File.FileName;

                // Check duplicate by OriginalFileName
                if (dto.SessionId.HasValue)
                {
                    // Check within the specific session
                    var existingNames = await _context.Assignments
                        .Where(a => a.SessionId == dto.SessionId && !string.IsNullOrEmpty(a.FileUrl))
                        .Select(a => a.FileUrl)
                        .ToListAsync();
                    bool isDuplicate = existingNames.Any(url => GetOriginalFileNameFromUrl(url) == originalFileName);
                    if (isDuplicate)
                        throw new ConflictException("File bài tập này đã tồn tại trong buổi học này."); 
                }
                
                // Always check library for duplicate OriginalFileName
                var existingLibraryNames = await _context.Assignments
                    .Where(a => a.SessionId == null && a.UserId == userId && !string.IsNullOrEmpty(a.FileUrl))
                    .Select(a => a.FileUrl)
                    .ToListAsync();
                bool isLibDuplicate = existingLibraryNames.Any(url => GetOriginalFileNameFromUrl(url) == originalFileName);
                if (isLibDuplicate)
                    throw new BadRequestException("File bài tập này đã tồn tại trong thư viện. Vui lòng chọn từ thư viện.");

                var files = new FormFileCollection { dto.File };
                var uploadedFiles = await _fileService.UploadResourceFile(files);
                var uploadedFile = uploadedFiles.FirstOrDefault();
                if (uploadedFile != null) fileUrl = uploadedFile.FilePath;
            }

            if (!string.IsNullOrEmpty(dto.Title))
            {
                var isUniqueTitle = await _context.Assignments.AnyAsync(e => dto.SessionId != null
                        && dto.SessionId == e.SessionId
                        && e.Title == dto.Title);
                if (isUniqueTitle) throw new ConflictException("Title đang bị trùng vui lòng đặt lại"); // Nên dùng BadRequestException thay vì Exception chung
            }

            if (!string.IsNullOrEmpty(dto.FileUrl))
            {
                fileUrl = dto.FileUrl.Trim();
            }

            var assignment = new Assignment
            {
                SessionId = dto.SessionId,
                Title = dto.Title,
                Description = dto.Description,
                FileUrl = fileUrl,
                StartTime = dto.StartTime ?? DateTime.Now,
                EndTime = dto.EndTime,
                UserId = userId,
                GradeId = dto.GradeId,
            };

            _context.Assignments.Add(assignment);

            // Nếu lưu vào kho và có session, tạo thêm 1 bản copy cho kho (SessionId = null)
            if (dto.SaveToLibrary && dto.SessionId.HasValue)
            {
                var existsInLib = await _context.Assignments
                    .AnyAsync(a => a.SessionId == null && a.UserId == userId 
                              && a.Title == assignment.Title && a.FileUrl == assignment.FileUrl);
                
                if (!existsInLib)
                {
                    var libraryAssignment = new Assignment
                    {
                        SessionId = null,
                        Title = assignment.Title,
                        Description = assignment.Description,
                        FileUrl = assignment.FileUrl,
                        StartTime = assignment.StartTime,
                        EndTime = assignment.EndTime,
                        UserId = userId,
                        GradeId = assignment.GradeId,
                    };
                    _context.Assignments.Add(libraryAssignment);
                }
            }

            await _context.SaveChangesAsync();
            return MapToResponseDto(assignment, baseUrl);
        }

        private AssignmentResponseDto MapToResponseDto(Assignment assignment, string baseUrl)
        {
            return new AssignmentResponseDto
            {
                AsmId = assignment.AsmId,
                SessionId = assignment.SessionId,
                ClassId = assignment.Session?.ClassId,
                GradeId = assignment.GradeId,
                Title = assignment.Title ?? "",
                Description = assignment.Description,
                StartTime = assignment.StartTime,
                EndTime = assignment.EndTime,
                FileUrl = !string.IsNullOrEmpty(assignment.FileUrl)
                    ? $"{baseUrl}/{assignment.FileUrl.Replace("\\", "/").Replace("wwwroot/", "")}"
                    : null,
                FileSize = GetFileSizeFromUrl(assignment.FileUrl),
                OriginalFileName = GetOriginalFileNameFromUrl(assignment.FileUrl),
                SubmissionsCount = assignment.Submissions?.Count ?? 0
            };
        }

        public async Task<AssignmentResponseDto> UpdateAssignmentAsync(int id, CreateAssignmentDto dto, string baseUrl)
        {
            var assignment = await _context.Assignments.FindAsync(id);
            if (assignment == null)
            {
                throw new Exception("Assignment not found");
            }

            string? fileUrl = assignment.FileUrl;

            if (dto.File != null)
            {
                string newOriginalFileName = dto.File.FileName;

                // Check duplicate (exclude current assignment)
                if (assignment.SessionId.HasValue)
                {
                    var existingNames = await _context.Assignments
                        .Where(a => a.SessionId == assignment.SessionId && a.AsmId != id && !string.IsNullOrEmpty(a.FileUrl))
                        .Select(a => a.FileUrl)
                        .ToListAsync();
                    bool isDuplicate = existingNames.Any(url => GetOriginalFileNameFromUrl(url) == newOriginalFileName);
                    if (isDuplicate)
                        throw new BadRequestException("File bài tập này đã tồn tại trong buổi học này.");
                }
                else
                {
                    // It's a template in the library
                    var userId = _userContextService.GetUserId();
                    var existingNames = await _context.Assignments
                        .Where(a => a.SessionId == null && a.UserId == userId && a.AsmId != id && !string.IsNullOrEmpty(a.FileUrl))
                        .Select(a => a.FileUrl)
                        .ToListAsync();
                    bool isDuplicate = existingNames.Any(url => GetOriginalFileNameFromUrl(url) == newOriginalFileName);
                    if (isDuplicate)
                        throw new BadRequestException("File bài tập này đã tồn tại trong thư viện.");
                }

                var files = new FormFileCollection { dto.File };
                var uploadedFiles = await _fileService.UploadResourceFile(files);
                var uploadedFile = uploadedFiles.FirstOrDefault();
                if (uploadedFile != null)
                {
                    fileUrl = uploadedFile.FilePath;
                }
            }

            assignment.Title = dto.Title;
            assignment.Description = dto.Description;
            assignment.SessionId = dto.SessionId;
            assignment.StartTime = dto.StartTime;
            assignment.EndTime = dto.EndTime;
            assignment.FileUrl = fileUrl;
            assignment.GradeId = dto.GradeId;

            // Nếu lưu vào kho và có session, tạo thêm 1 bản copy cho kho (SessionId = null)
            if (dto.SaveToLibrary && assignment.SessionId.HasValue)
            {
                var userId = _userContextService.GetUserId();
                var existsInLib = await _context.Assignments
                    .AnyAsync(a => a.SessionId == null && a.UserId == userId 
                              && a.Title == assignment.Title && a.FileUrl == assignment.FileUrl);
                
                if (!existsInLib)
                {
                    var libraryAssignment = new Assignment
                    {
                        SessionId = null,
                        Title = assignment.Title,
                        Description = assignment.Description,
                        FileUrl = assignment.FileUrl,
                        StartTime = assignment.StartTime,
                        EndTime = assignment.EndTime,
                        UserId = userId,
                        GradeId = assignment.GradeId,
                    };
                    _context.Assignments.Add(libraryAssignment);
                }
            }

            await _context.SaveChangesAsync();
            return MapToResponseDto(assignment, baseUrl);
        }
        public async Task<List<AssignmentResponseDto>> GetAssignmentsBySessionAsync(int sessionId, string baseUrl)
        {
            var rawAssignments = await _context.Assignments
                .Include(a => a.Session)
                .Include(a => a.Submissions)
                .Where(a => a.SessionId == sessionId)
                .ToListAsync();

            var assignments = rawAssignments.Select(a => new AssignmentResponseDto
                {
                    AsmId = a.AsmId,
                    SessionId = a.SessionId,
                    ClassId = a.Session?.ClassId,
                    GradeId = a.GradeId,
                    Title = a.Title,
                    Description = a.Description,
                    StartTime = a.StartTime,
                    EndTime = a.EndTime,
                    FileUrl = !string.IsNullOrEmpty(a.FileUrl)
                        ? $"{baseUrl}/{a.FileUrl.Replace("\\", "/").Replace("wwwroot/", "")}"
                        : null,
                    FileSize = GetFileSizeFromUrl(a.FileUrl),
                    OriginalFileName = GetOriginalFileNameFromUrl(a.FileUrl),
                    SubmissionsCount = a.Submissions?.Count ?? 0
                })
                .ToList();

            return assignments;
        }
        public async Task<List<AssignmentResponseDto>> GetAllAssignmentsAsync(string baseUrl)
        {
            var userId = _userContextService.GetUserId();
            var rawAssignments = await _context.Assignments
                .Include(a => a.Session)
                .Include(a => a.Submissions)
                .Where(a => a.UserId == userId) 
                .ToListAsync();

            var assignments = rawAssignments
                .Select(x => MapToResponseDto(x, baseUrl))
                .ToList();

            return assignments;
        }

        public async Task<Assignment> ImportAssignmentAsync(int assignmentId, int sessionId, DateTime? endTime = null)
        {
            var source = await _context.Assignments.FindAsync(assignmentId);
            if (source == null) throw new Exception("Source assignment not found");

            var userId = _userContextService.GetUserId();
            string sourceOriginalName = GetOriginalFileNameFromUrl(source.FileUrl);

            // Check duplicate by filename only
            if (!string.IsNullOrEmpty(sourceOriginalName))
            {
                var existingNames = await _context.Assignments
                    .Where(a => a.SessionId == sessionId && !string.IsNullOrEmpty(a.FileUrl))
                    .Select(a => a.FileUrl)
                    .ToListAsync();
                bool isDuplicate = existingNames.Any(url => GetOriginalFileNameFromUrl(url) == sourceOriginalName);
                if (isDuplicate)
                    throw new BadRequestException("File bài tập này đã tồn tại trong buổi học này.");
            }
            else
            {
                // Fallback: check by FileUrl (same blob)
                bool isDuplicate = await _context.Assignments
                    .AnyAsync(a => a.SessionId == sessionId && a.FileUrl == source.FileUrl);
                if (isDuplicate)
                    throw new BadRequestException("File bài tập này đã tồn tại trong buổi học này.");
            }

            var assignment = new Assignment
            {
                SessionId = sessionId,
                Title = source.Title,
                Description = source.Description,
                FileUrl = source.FileUrl,
                StartTime = DateTime.Now,
                EndTime = endTime ?? DateTime.Now.AddDays(7),
                UserId = userId,
                GradeId = source.GradeId
            };

            _context.Assignments.Add(assignment);
            await _context.SaveChangesAsync();
            return assignment;
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

        public async Task<bool> DeleteAssignmentAsync(int id)
        {
            var assignment = await _context.Assignments.FindAsync(id);
            if (assignment == null) return false;

            _context.Assignments.Remove(assignment);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<AssignmentGradingDto> GetAssignmentGradingAsync(int assignmentId, string baseUrl)
        {
            var assignment = await _context.Assignments
                .Include(a => a.Session)
                    .ThenInclude(s => s.Class)
                        .ThenInclude(c => c.Students)
                            .ThenInclude(st => st.StudentNavigation)
                .Include(a => a.Submissions)
                .FirstOrDefaultAsync(a => a.AsmId == assignmentId);

            if (assignment == null)
                throw new Exception("Assignment not found");

            var result = new AssignmentGradingDto
            {
                Assignment = new AssignmentResponseDto
                {
                    AsmId = assignment.AsmId,
                    SessionId = assignment.SessionId,
                    GradeId = assignment.GradeId,
                    Title = assignment.Title ?? "",
                    Description = assignment.Description,
                    StartTime = assignment.StartTime,
                    EndTime = assignment.EndTime,
                    FileUrl = !string.IsNullOrEmpty(assignment.FileUrl)
                        ? $"{baseUrl}/{assignment.FileUrl.Replace("\\", "/").Replace("wwwroot/", "")}"
                        : null,
                    FileSize = GetFileSizeFromUrl(assignment.FileUrl),
                    OriginalFileName = GetOriginalFileNameFromUrl(assignment.FileUrl)
                },
                Students = new List<StudentSubmissionDto>()
            };

            // Lấy danh sách học sinh từ Class nếu có gán session và class
            var studentsInClass = assignment.Session?.Class?.Students ?? new List<Student>();

            foreach (var student in studentsInClass)
            {
                var submission = assignment.Submissions.FirstOrDefault(s => s.StudentId == student.UserId);
                
                result.Students.Add(new StudentSubmissionDto
                {
                    StudentId = student.UserId,
                    FullName = student.StudentNavigation?.FullName ?? "Unknown Student",
                    Submission = submission == null ? null : new EducenAPI.DTOs.Submissions.SubmissionResponseDto
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
                    }
                });
            }

            return result;
        }

        public async Task<List<Assignment>> GetAssignedAssignments(string? type)
        {
            var userId = _userContextService.GetUserId();
            var assignments = _context.Assignments
                .Where(e => e.SessionId != null && e.UserId != null && e.UserId == userId);
            if(!string.IsNullOrEmpty(type))
            {
                var now = DateTime.Now;
                if(type == "open")
                {
                    assignments = assignments.Where(e => e.StartTime <= now && e.EndTime >= now);
                }
                else if(type == "expired")
                {
                    assignments = assignments.Where(e => e.EndTime < now);
                }
            }
            return await assignments.ToListAsync();
        }
    }
}
