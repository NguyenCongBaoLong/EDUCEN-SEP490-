using System.Collections.Generic;

namespace EducenAPI.DTOs.Parents
{
    public class ChildPerformanceReportDto
    {
        public int StudentId { get; set; }
        public string ChildName { get; set; } = string.Empty;
        public decimal OverallGPA { get; set; }
        public decimal OverallAttendanceRate { get; set; }
        public int TotalAssignmentsSubmitted { get; set; }
        public int TotalAssignmentsAssigned { get; set; }
        public List<ClassPerformanceSummaryDto> ClassSummaries { get; set; } = new();
    }

    public class ClassPerformanceSummaryDto
    {
        public int ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string TeacherName { get; set; } = string.Empty;
        public int TotalSessionsPassed { get; set; }
        public int AttendedSessions { get; set; }
        public decimal AttendanceRate { get; set; }
        public int TotalAssignments { get; set; }
        public int SubmittedAssignments { get; set; }
        public decimal? AverageScore { get; set; }
        public string? LatestFeedback { get; set; }
        public string Rank { get; set; } = "—";
        public string Status { get; set; } = string.Empty;
    }
}
