namespace EducenAPI.DTOs.CenterDashboard
{
    public class CenterDashboardResponse
    {
        public OverviewDto Overview { get; set; }
        public List<StudentRegistrationDto> StudentRegistrationChart { get; set; }
        public List<SubjectDistributionDto> StudentsBySubject { get; set; }
    }

    public class OverviewDto
    {
        public int TotalStudents { get; set; }
        public int TotalClasses { get; set; }
        public int UpcomingClasses { get; set; }
        public int TotalStaff { get; set; }
        public int ActiveStaff { get; set; }
        public int NewStudentsThisMonth { get; set; }
        public int CurrentUsers { get; set; }
        public int MaxUsers { get; set; }
        public double CurrentStorageMB { get; set; }
        public double MaxStorageMB { get; set; }
    }

    public class StudentRegistrationDto
    {
        public int Month { get; set; }
        public int Students { get; set; }
    }

    public class SubjectDistributionDto
    {
        public string Subject { get; set; }
        public int TotalStudents { get; set; }
        public double Percentage { get; set; }
    }
}