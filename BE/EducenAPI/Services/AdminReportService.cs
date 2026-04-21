using EducenAPI.DTOs.Admin;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace EducenAPI.Services
{
    public class AdminReportService : IAdminReportService
    {
        private readonly EducenV2Context _context;
        private readonly ILogger<AdminReportService> _logger;

        public AdminReportService(EducenV2Context context, ILogger<AdminReportService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<TeacherStatisticsResponse> GetTeacherTeachingStatsAsync(int month, int year)
        {
            // 1. Get all teachers and assistants
            var teachers = await _context.Teachers
                .Include(t => t.TeacherNavigation)
                .ToListAsync();

            var assistants = await _context.Assistants
                .Include(a => a.AssistantNavigation)
                .ToListAsync();

            // 2. Query sessions in the selected month/year
            // Logic: Count if (Completed OR has Attendance)
            var sessions = await _context.ClassSessions
                .Include(s => s.Class).ThenInclude(c => (c != null) ? c.Subject : null)
                .Include(s => s.Class).ThenInclude(c => (c != null) ? c.Grade : null)
                .Include(s => s.Class).ThenInclude(c => (c != null) ? c.Room : null)
                .Include(s => s.Schedule).ThenInclude(sc => sc.Room)
                .Include(s => s.Attendances)
                .Where(s => s.SessionDate.Month == month && s.SessionDate.Year == year)
                .Where(s => s.Status == "Completed" || s.Attendances.Any())
                .ToListAsync();

            var stats = new List<TeacherTeachingStatsDto>();

            // Process Teachers
            foreach (var t in teachers)
            {
                var teacherSessions = sessions.Where(s => s.Class?.TeacherId == t.UserId).ToList();
                var taughtCount = teacherSessions.Count;
                var activeClassesCount = await _context.Classes.CountAsync(c => c.TeacherId == t.UserId && c.Status == "Active");

                // Get per-class details for this teacher
                var classDetails = teacherSessions
                    .GroupBy(s => new { 
                        s.ClassId, 
                        s.Class.ClassName,
                        SubjectName = s.Class.Subject != null ? s.Class.Subject.SubjectName : "N/A",
                        GradeName = s.Class.Grade != null ? s.Class.Grade.GradeName : "N/A"
                    })
                    .Select(g => new ClassTeachingStatsDto
                    {
                        ClassId = g.Key.ClassId ?? 0,
                        ClassName = g.Key.ClassName,
                        SubjectName = g.Key.SubjectName,
                        GradeName = g.Key.GradeName,
                        RoomName = string.Join(", ", g.Select(s => s.Schedule?.Room?.RoomName ?? s.Class?.Room?.RoomName ?? "N/A")
                                                     .Where(r => r != "N/A")
                                                     .Distinct()),
                        TaughtSessions = g.Count(),
                        SessionDates = g.Select(s => s.SessionDate).OrderBy(d => d).ToList()
                    })
                    .Select(c => {
                        if (string.IsNullOrEmpty(c.RoomName)) c.RoomName = "N/A";
                        return c;
                    })
                    .OrderByDescending(c => c.TaughtSessions)
                    .ToList();

                stats.Add(new TeacherTeachingStatsDto
                {
                    TeacherId = t.UserId,
                    FullName = t.TeacherNavigation?.FullName,
                    Email = t.TeacherNavigation?.Email,
                    Role = "Teacher",
                    TaughtSessions = taughtCount,
                    TotalClasses = activeClassesCount,
                    ClassDetails = classDetails
                });
            }

            // Process Assistants
            foreach (var a in assistants)
            {
                var assistantSessions = sessions.Where(s => s.Class?.AssistantId == a.UserId).ToList();
                var taughtCount = assistantSessions.Count;
                var activeClassesCount = await _context.Classes.CountAsync(c => c.AssistantId == a.UserId && c.Status == "Active");

                // Get per-class details for this assistant
                var classDetails = assistantSessions
                    .GroupBy(s => new { 
                        s.ClassId, 
                        s.Class.ClassName,
                        SubjectName = s.Class.Subject != null ? s.Class.Subject.SubjectName : "N/A",
                        GradeName = s.Class.Grade != null ? s.Class.Grade.GradeName : "N/A"
                    })
                    .Select(g => new ClassTeachingStatsDto
                    {
                        ClassId = g.Key.ClassId ?? 0,
                        ClassName = g.Key.ClassName,
                        SubjectName = g.Key.SubjectName,
                        GradeName = g.Key.GradeName,
                        RoomName = string.Join(", ", g.Select(s => s.Schedule?.Room?.RoomName ?? s.Class?.Room?.RoomName ?? "N/A")
                                                     .Where(r => r != "N/A")
                                                     .Distinct()),
                        TaughtSessions = g.Count(),
                        SessionDates = g.Select(s => s.SessionDate).OrderBy(d => d).ToList()
                    })
                    .Select(c => {
                        if (string.IsNullOrEmpty(c.RoomName)) c.RoomName = "N/A";
                        return c;
                    })
                    .OrderByDescending(c => c.TaughtSessions)
                    .ToList();

                stats.Add(new TeacherTeachingStatsDto
                {
                    TeacherId = a.UserId,
                    FullName = a.AssistantNavigation?.FullName,
                    Email = a.AssistantNavigation?.Email,
                    Role = "Assistant",
                    TaughtSessions = taughtCount,
                    TotalClasses = activeClassesCount,
                    ClassDetails = classDetails
                });
            }

            return new TeacherStatisticsResponse
            {
                Month = month,
                Year = year,
                Statistics = stats.OrderByDescending(s => s.TaughtSessions).ToList(),
                TotalSessionsInCenter = sessions.Count
            };
        }

        public async Task<byte[]> ExportTeacherTeachingStatsToCsvAsync(int month, int year)
        {
            var data = await GetTeacherTeachingStatsAsync(month, year);
            
            var csv = new StringBuilder();
            // Add BOM for UTF-8 Excel support
            csv.Append('\uFEFF');
            
            csv.AppendLine($"BÁO CÁO THỐNG KÊ GIẢNG DẠY CHI TIẾT - THÁNG {month}/{year}");
            csv.AppendLine($"Tổng số buổi dạy toàn trung tâm: {data.TotalSessionsInCenter}");
            csv.AppendLine();
            csv.AppendLine("Họ tên,Email,Vai trò,Tổng số buổi,Chi tiết lớp học");

            foreach (var item in data.Statistics)
            {
                var detailsString = string.Join(" | ", item.ClassDetails.Select(c => $"{c.ClassName}: {c.TaughtSessions} buổi"));
                csv.AppendLine($"{EscapeCsv(item.FullName)},{EscapeCsv(item.Email)},{item.Role},{item.TaughtSessions},{EscapeCsv(detailsString)}");
            }

            return Encoding.UTF8.GetBytes(csv.ToString());
        }

        private string EscapeCsv(string? value)
        {
            if (string.IsNullOrEmpty(value)) return "";
            if (value.Contains(",") || value.Contains("\"") || value.Contains("\n") || value.Contains("\r"))
            {
                return $"\"{value.Replace("\"", "\"\"")}\"";
            }
            return value;
        }
    }
}
