using EduCen.DTOs.TeacherDashboard;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class TeacherReportService : ITeacherReportService
    {
        private readonly EducenV2Context _db;

        public TeacherReportService(EducenV2Context db)
        {
            _db = db;
        }

        public async Task<TeacherPerformanceResponse> GetReportByClassAsync(int classId)
        {
            // 1. Lấy tổng số buổi học đã hoàn thành của lớp để tính chuyên cần
            var totalCompletedSessions = await _db.ClassSessions
                .CountAsync(cs => cs.ClassId == classId && cs.Status == "Completed");

            // 2. Truy vấn dữ liệu thô từ Database
            var studentsData = await _db.Students
                .Where(s => s.Classes.Any(c => c.ClassId == classId))
                .Select(s => new
                {
                    s.UserId,
                    FullName = s.StudentNavigation != null ? s.StudentNavigation.FullName : "N/A",
                    // Ép kiểu decimal sang double ngay từ đầu để tính Average dễ dàng
                    Scores = s.Submissions.Select(sub => (double)(sub.Score ?? 0)),
                    PresentCount = s.Attendances.Count(a => a.Session.ClassId == classId && a.Status == "Present")
                })
                .ToListAsync();

            if (!studentsData.Any()) return new TeacherPerformanceResponse();

            // 3. Xử lý logic tính toán trên Memory (để tránh lỗi dịch Linq to SQL phức tạp)
            var studentList = studentsData.Select(s => new
            {
                s.UserId,
                s.FullName,
                AverageScore = s.Scores.Any() ? s.Scores.Average() : 0.0,
                AttendanceRate = totalCompletedSessions > 0
                    ? (double)s.PresentCount / totalCompletedSessions * 100
                    : 0.0
            }).ToList();

            // 4. Tính toán Metrics tổng quan
            double classAvgGrade = studentList.Average(s => s.AverageScore);
            double classAvgAttendance = studentList.Average(s => s.AttendanceRate);

            var response = new TeacherPerformanceResponse();

            response.Metrics.Add("avgGrade", new MetricDto
            {
                Value = $"{Math.Round(classAvgGrade, 1)}",
                Trend = "Dựa trên Submissions",
                TrendClass = "positive"
            });

            response.Metrics.Add("attendance", new MetricDto
            {
                Value = $"{Math.Round(classAvgAttendance, 1)}%",
                Trend = "Dựa trên Sessions",
                TrendClass = "neutral"
            });

            // 5. Phân bố điểm số
            response.GradeData = studentList
                .Select(s => GetGradeLetter(s.AverageScore))
                .GroupBy(g => g)
                .Select(g => new GradeDataDto { Grade = g.Key, Count = g.Count() })
                .OrderBy(g => g.Grade)
                .ToList();

            // 6. Top 5 học sinh (Sửa lỗi ép kiểu tại dòng 63, 77 như ảnh)
            response.TopStudents = studentList
                .OrderByDescending(s => s.AverageScore)
                .Take(5)
                .Select(s => new TopStudentDto
                {
                    Id = s.UserId.ToString(),
                    Name = s.FullName,
                    Score = Math.Round(s.AverageScore, 1),
                    Attendance = Math.Round(s.AttendanceRate, 1),
                    Status = s.AverageScore >= 8.0 ? "Xuất sắc" : "Khá/Giỏi",
                    StatusColor = s.AverageScore >= 8.0 ? "green" : "blue",
                    Avatar = !string.IsNullOrEmpty(s.FullName) ? s.FullName.Substring(0, 1) : "S"
                })
                .ToList();

            // 7. Dữ liệu xu hướng
            response.AttendanceData = new List<AttendanceDataDto>
            {
                new() { Week = "Hiện tại", Rate = Math.Round(classAvgAttendance, 1) }
            };

            return response;
        }

        private string GetGradeLetter(double score)
        {
            if (score >= 9) return "A";
            if (score >= 7) return "B";
            if (score >= 5) return "C";
            return "F";
        }
    }
}