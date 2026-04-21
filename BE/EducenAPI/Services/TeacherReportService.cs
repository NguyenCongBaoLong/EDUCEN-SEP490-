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
                HasScore = s.Scores.Any(),
                AverageScore = s.Scores.Any() ? s.Scores.Average() : 0.0,
                AttendanceRate = totalCompletedSessions > 0
                    ? (double)s.PresentCount / totalCompletedSessions * 100
                    : 0.0
            }).ToList();

            var studentsWithScore = studentList.Where(s => s.HasScore).ToList();

            // 5. Tính toán Metrics tổng quan
            double classAvgGrade = studentsWithScore.Any() ? studentsWithScore.Average(s => s.AverageScore) : 0.0;
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
            response.GradeData = studentsWithScore
                .Select(s => GetGradeLetter(s.AverageScore))
                .GroupBy(g => g)
                .Select(g => new GradeDataDto { Grade = g.Key, Count = g.Count() })
                .OrderBy(g => g.Grade)
                .ToList();

            // 7. Top 5 học sinh
            response.TopStudents = studentsWithScore
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

            // 8. Dữ liệu xu hướng (7 ngày dương lịch gần nhất)
            var today = DateTime.Now.Date;
            var sevenDaysAgo = today.AddDays(-6);

            var recentSessionsInfo = await _db.ClassSessions
                .Where(s => s.ClassId == classId && s.SessionDate >= sevenDaysAgo && s.SessionDate <= today && s.Attendances.Any())
                .Select(s => new
                {
                    SessionDate = s.SessionDate.Date,
                    Total = s.Attendances.Count(),
                    Present = s.Attendances.Count(x => x.Status == "present" || x.Status == "Present")
                })
                .ToListAsync();

            var attendanceTrends = Enumerable.Range(0, 7)
                .Select(i => sevenDaysAgo.AddDays(i))
                .Select(date =>
                {
                    var sessionsOnDate = recentSessionsInfo.Where(s => s.SessionDate == date);
                    var total = sessionsOnDate.Sum(s => s.Total);
                    var present = sessionsOnDate.Sum(s => s.Present);
                    return new AttendanceDataDto
                    {
                        Week = date.ToString("dd/MM"),
                        Rate = Math.Round(total > 0 ? (double)present / total * 100 : 0.0, 1)
                    };
                })
                .ToList();

            response.AttendanceData = attendanceTrends;

            // 9. Thống kê số buổi dạy hàng tháng (6 tháng gần nhất)
            var sixMonthsAgo = new DateTime(today.Year, today.Month, 1).AddMonths(-5);
            var monthlyTeachingInfo = await _db.ClassSessions
                .Where(s => s.ClassId == classId && s.SessionDate >= sixMonthsAgo && (s.Status == "Completed" || s.Attendances.Any()))
                .GroupBy(s => new { s.SessionDate.Year, s.SessionDate.Month })
                .Select(g => new { Year = g.Key.Year, Month = g.Key.Month, Count = g.Count() })
                .ToListAsync();

            response.TeachingHistory = Enumerable.Range(0, 6)
                .Select(i => sixMonthsAgo.AddMonths(i))
                .Select(monthDate =>
                {
                    var record = monthlyTeachingInfo.FirstOrDefault(m => m.Year == monthDate.Year && m.Month == monthDate.Month);
                    return new TeachingHistoryDto { Month = monthDate.ToString("MM/yyyy"), SessionCount = record?.Count ?? 0 };
                })
                .ToList();

            return response;
        }

        public async Task<TeacherPerformanceResponse> GetTeacherOverallReportAsync(int teacherUserId)
        {
            // 1. Lấy danh sách ClassId mà giáo viên này phụ trách (Chính hoặc Trợ giảng)
            var classIds = await _db.Classes
                .Where(c => c.TeacherId == teacherUserId || c.AssistantId == teacherUserId)
                .Select(c => c.ClassId)
                .ToListAsync();

            if (!classIds.Any()) return new TeacherPerformanceResponse();

            // 2. Lấy dữ liệu tổng hợp
            var totalCompletedSessions = await _db.ClassSessions
                .CountAsync(cs => cs.ClassId.HasValue && classIds.Contains(cs.ClassId.Value) && (cs.Status == "Completed" || cs.Attendances.Any()));

            var totalAssignments = await _db.Assignments.CountAsync(a => a.Session.ClassId.HasValue && classIds.Contains(a.Session.ClassId.Value));
            var totalActualSubmissions = await _db.Submissions.CountAsync(s => s.Asm.Session.ClassId.HasValue && classIds.Contains(s.Asm.Session.ClassId.Value));

            // 3. Lấy dữ liệu học sinh từ tất cả các lớp này
            var studentsData = await _db.Students
                .Where(s => s.Classes.Any(c => classIds.Contains(c.ClassId)))
                .Select(s => new
                {
                    s.UserId,
                    FullName = s.StudentNavigation != null ? s.StudentNavigation.FullName : "N/A",
                    Scores = s.Submissions.Where(sub => sub.Asm.Session.ClassId.HasValue && classIds.Contains(sub.Asm.Session.ClassId.Value)).Select(sub => (double)(sub.Score ?? 0)),
                    PresentCount = s.Attendances.Count(a => a.Session.ClassId.HasValue && classIds.Contains(a.Session.ClassId.Value) && (a.Status == "present" || a.Status == "Present")),
                    ClassNames = s.Classes.Where(c => classIds.Contains(c.ClassId)).Select(c => c.ClassName).ToList()
                })
                .ToListAsync();

            if (!studentsData.Any()) return new TeacherPerformanceResponse();

            // 4. Tính toán logic
            var studentList = studentsData.Select(s => new
            {
                s.UserId,
                s.FullName,
                HasScore = s.Scores.Any(),
                AverageScore = s.Scores.Any() ? s.Scores.Average() : 0.0,
                AttendanceRate = totalCompletedSessions > 0
                    ? (double)s.PresentCount / totalCompletedSessions * 100
                    : 0.0,
                ClassNames = s.ClassNames
            }).ToList();

            var studentsWithScore = studentList.Where(s => s.HasScore).ToList();

            double classAvgGrade = studentsWithScore.Any() ? studentsWithScore.Average(s => s.AverageScore) : 0.0;
            double classAvgAttendance = studentList.Any() ? studentList.Average(s => s.AttendanceRate) : 0.0;

            double expectedSubmissions = totalAssignments * studentsData.Count;
            double submissionRate = expectedSubmissions > 0 ? (double)totalActualSubmissions / expectedSubmissions * 100 : 0.0;
            double growthRate = classAvgGrade > 0 ? (classAvgGrade / 10.0) * 100 : 0.0;

            var response = new TeacherPerformanceResponse();

            response.Metrics.Add("avgGrade", new MetricDto { Value = $"{Math.Round(classAvgGrade, 1)}", Trend = "Tổng tất cả lớp", TrendClass = classAvgGrade >= 7 ? "positive" : "neutral" });
            response.Metrics.Add("attendance", new MetricDto { Value = $"{Math.Round(classAvgAttendance, 1)}%", Trend = "Tổng tất cả lớp", TrendClass = classAvgAttendance >= 80 ? "positive" : "neutral" });
            response.Metrics.Add("assignments", new MetricDto { Value = $"{Math.Round(submissionRate, 1)}%", Trend = $"{totalActualSubmissions}/{expectedSubmissions} bài", TrendClass = submissionRate >= 70 ? "positive" : "neutral" });
            response.Metrics.Add("growth", new MetricDto { Value = $"{Math.Round(growthRate, 1)}%", Trend = classAvgGrade >= 8 ? "Tốt" : "Ổn định", TrendClass = classAvgGrade >= 8 ? "positive" : "neutral" });

            response.GradeData = studentsWithScore
                .Select(s => GetGradeLetter(s.AverageScore))
                .GroupBy(g => g)
                .Select(g => new GradeDataDto { Grade = g.Key, Count = g.Count() })
                .OrderBy(g => g.Grade)
                .ToList();

            response.TopStudents = studentsWithScore
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
                    Avatar = !string.IsNullOrEmpty(s.FullName) ? s.FullName.Substring(0, 1) : "S",
                    ClassName = s.ClassNames.Any() ? string.Join(", ", s.ClassNames) : ""
                })
                .ToList();

            // 8. Dữ liệu xu hướng toàn bộ (7 ngày dương lịch gần nhất)
            var today = DateTime.Now.Date;
            var sevenDaysAgo = today.AddDays(-6);

            var recentDaysInfo = await _db.ClassSessions
                .Where(s => s.ClassId.HasValue && classIds.Contains(s.ClassId.Value) && s.SessionDate >= sevenDaysAgo && s.SessionDate <= today && s.Attendances.Any())
                .Select(s => new
                {
                    SessionDate = s.SessionDate.Date,
                    Total = s.Attendances.Count(),
                    Present = s.Attendances.Count(x => x.Status == "present" || x.Status == "Present")
                })
                .ToListAsync();

            var attendanceTrendsOverall = Enumerable.Range(0, 7)
                .Select(i => sevenDaysAgo.AddDays(i))
                .Select(date =>
                {
                    var sessionsOnDate = recentDaysInfo.Where(s => s.SessionDate == date);
                    var total = sessionsOnDate.Sum(s => s.Total);
                    var present = sessionsOnDate.Sum(s => s.Present);
                    return new AttendanceDataDto
                    {
                        Week = date.ToString("dd/MM"),
                        Rate = Math.Round(total > 0 ? (double)present / total * 100 : 0.0, 1)
                    };
                })
                .ToList();

            response.AttendanceData = attendanceTrendsOverall;

            // 9. Thống kê số buổi dạy hàng tháng (6 tháng gần nhất)
            var sixMonthsAgoOverall = new DateTime(today.Year, today.Month, 1).AddMonths(-5);
            var monthlyTeachingInfoOverall = await _db.ClassSessions
                .Where(s => s.ClassId.HasValue && classIds.Contains(s.ClassId.Value) && s.SessionDate >= sixMonthsAgoOverall && (s.Status == "Completed" || s.Attendances.Any()))
                .GroupBy(s => new { s.SessionDate.Year, s.SessionDate.Month })
                .Select(g => new { Year = g.Key.Year, Month = g.Key.Month, Count = g.Count() })
                .ToListAsync();

            response.TeachingHistory = Enumerable.Range(0, 6)
                .Select(i => sixMonthsAgoOverall.AddMonths(i))
                .Select(monthDate =>
                {
                    var record = monthlyTeachingInfoOverall.FirstOrDefault(m => m.Year == monthDate.Year && m.Month == monthDate.Month);
                    return new TeachingHistoryDto { Month = monthDate.ToString("MM/yyyy"), SessionCount = record?.Count ?? 0 };
                })
                .ToList();

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