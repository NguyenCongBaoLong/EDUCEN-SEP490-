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
            // 1. Lấy tổng số buổi học có điểm danh hoặc đã hoàn thành để tính chuyên cần
            var totalCompletedSessions = await _db.ClassSessions
                .CountAsync(cs => cs.ClassId == classId && (cs.Status == "Completed" || cs.Attendances.Any()));

            // 2. Lấy dữ liệu bài tập để tính tỷ lệ nộp bài
            var totalAssignments = await _db.Assignments.CountAsync(a => a.Session.ClassId == classId);
            var totalActualSubmissions = await _db.Submissions.CountAsync(s => s.Asm.Session.ClassId == classId);

            // 3. Truy vấn dữ liệu thô từ Database
            var studentsData = await _db.Students
                .Where(s => s.Classes.Any(c => c.ClassId == classId))
                .Select(s => new
                {
                    s.UserId,
                    FullName = s.StudentNavigation != null ? s.StudentNavigation.FullName : "N/A",
                    // Ép kiểu decimal sang double ngay từ đầu để tính Average dễ dàng
                    Scores = s.Submissions.Where(sub => sub.Asm.Session.ClassId == classId).Select(sub => (double)(sub.Score ?? 0)),
                    PresentCount = s.Attendances.Count(a => a.Session.ClassId == classId && (a.Status == "present" || a.Status == "Present"))
                })
                .ToListAsync();

            if (!studentsData.Any()) return new TeacherPerformanceResponse();

            // 4. Xử lý logic tính toán trên Memory
            var studentList = studentsData.Select(s => new
            {
                s.UserId,
                s.FullName,
                AverageScore = s.Scores.Any() ? s.Scores.Average() : 0.0,
                AttendanceRate = totalCompletedSessions > 0
                    ? (double)s.PresentCount / totalCompletedSessions * 100
                    : 0.0
            }).ToList();

            // 5. Tính toán Metrics tổng quan
            double classAvgGrade = studentList.Any() ? studentList.Average(s => s.AverageScore) : 0.0;
            double classAvgAttendance = studentList.Any() ? studentList.Average(s => s.AttendanceRate) : 0.0;
            
            // Tính tỷ lệ nộp bài: (Tổng bài nộp thực tế) / (Tổng số bài tập giao * Số học sinh)
            double expectedSubmissions = totalAssignments * studentsData.Count;
            double submissionRate = expectedSubmissions > 0 ? (double)totalActualSubmissions / expectedSubmissions * 100 : 0.0;

            // Tính mức độ tiến bộ (Growth): So sánh trung bình lớp với mốc 7.0
            double growthRate = classAvgGrade > 0 ? (classAvgGrade / 10.0) * 100 : 0.0;

            var response = new TeacherPerformanceResponse();

            // Metric 1: Điểm trung bình
            response.Metrics.Add("avgGrade", new MetricDto
            {
                Value = $"{Math.Round(classAvgGrade, 1)}",
                Trend = "Dựa trên Submissions",
                TrendClass = classAvgGrade >= 7 ? "positive" : "neutral"
            });

            // Metric 2: Chuyên cần
            response.Metrics.Add("attendance", new MetricDto
            {
                Value = $"{Math.Round(classAvgAttendance, 1)}%",
                Trend = "Dựa trên Sessions",
                TrendClass = classAvgAttendance >= 80 ? "positive" : "neutral"
            });

            // Metric 3: Tỷ lệ nộp bài (Mới bổ sung)
            response.Metrics.Add("assignments", new MetricDto
            {
                Value = $"{Math.Round(submissionRate, 1)}%",
                Trend = $"{totalActualSubmissions}/{expectedSubmissions} bài",
                TrendClass = submissionRate >= 70 ? "positive" : "neutral"
            });

            // Metric 4: Mức độ tiến bộ (Mới bổ sung)
            response.Metrics.Add("growth", new MetricDto
            {
                Value = $"{Math.Round(growthRate, 1)}%",
                Trend = classAvgGrade >= 8 ? "Tốt" : "Ổn định",
                TrendClass = classAvgGrade >= 8 ? "positive" : "neutral"
            });

            // 6. Phân bố điểm số
            response.GradeData = studentList
                .Select(s => GetGradeLetter(s.AverageScore))
                .GroupBy(g => g)
                .Select(g => new GradeDataDto { Grade = g.Key, Count = g.Count() })
                .OrderBy(g => g.Grade)
                .ToList();

            // 7. Top 5 học sinh
            response.TopStudents = studentList
                .OrderByDescending(s => s.AverageScore)
                .Take(5)
                .Select(s => new TopStudentDto
                {
                    Id = s.UserId.ToString(),
                    Name = s.FullName,
                    Score = Math.Round(s.AverageScore, 1),
                    Attendance = Math.Round(s.AttendanceRate, 1),
                    Status = s.AverageScore >= 8.0 ? "Xuất sắc" : "Khả/Giỏi",
                    StatusColor = s.AverageScore >= 8.0 ? "green" : "blue",
                    Avatar = !string.IsNullOrEmpty(s.FullName) ? s.FullName.Substring(0, 1) : "S"
                })
                .ToList();

            // 8. Dữ liệu xu hướng
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