using System;
using System.Collections.Generic;

namespace EducenAPI.DTOs.Admin
{
    public class ClassTeachingStatsDto
    {
        public int ClassId { get; set; }
        public string? ClassName { get; set; }
        public string? SubjectName { get; set; }
        public string? GradeName { get; set; }
        public string? RoomName { get; set; }
        public int TaughtSessions { get; set; }
        public List<DateTime> SessionDates { get; set; } = new();
    }

    public class TeacherTeachingStatsDto
    {
        public int TeacherId { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string Role { get; set; } = "Teacher"; // Teacher or Assistant
        public int TaughtSessions { get; set; }
        public int TotalClasses { get; set; }
        public List<ClassTeachingStatsDto> ClassDetails { get; set; } = new();
    }

    public class TeacherStatisticsResponse
    {
        public int Month { get; set; }
        public int Year { get; set; }
        public List<TeacherTeachingStatsDto> Statistics { get; set; } = new();
        public int TotalSessionsInCenter { get; set; }
    }
}
