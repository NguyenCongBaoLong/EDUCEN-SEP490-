namespace EduCen.DTOs.TeacherDashboard
{
    public class TeacherPerformanceResponse
    {
        public Dictionary<string, MetricDto> Metrics { get; set; } = new();
        public List<GradeDataDto> GradeData { get; set; } = new();
        public List<AttendanceDataDto> AttendanceData { get; set; } = new();
        public List<TopStudentDto> TopStudents { get; set; } = new();
        public List<TeachingHistoryDto> TeachingHistory { get; set; } = new();
    }

    public class MetricDto
    {
        public string Value { get; set; }
        public string Trend { get; set; }
        public string TrendClass { get; set; }
    }

    public class GradeDataDto
    {
        public string Grade { get; set; }
        public int Count { get; set; }
    }

    public class AttendanceDataDto
    {
        public string Week { get; set; }
        public double Rate { get; set; }
    }

    public class TopStudentDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public double Score { get; set; }
        public double Attendance { get; set; }
        public string Status { get; set; }
        public string StatusColor { get; set; }
        public string Avatar { get; set; }
        public string ClassName { get; set; }
    }

    public class TeachingHistoryDto
    {
        public string Month { get; set; }
        public int SessionCount { get; set; }
    }
}