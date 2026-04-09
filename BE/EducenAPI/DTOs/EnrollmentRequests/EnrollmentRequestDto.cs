using System;

namespace EducenAPI.DTOs.EnrollmentRequests
{
    public class EnrollmentRequestDto
    {
        public int RequestId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? PreferredCourse { get; set; }
        public string? Address { get; set; }
        public string? ParentName { get; set; }
        public string? ParentPhone { get; set; }
        public string? ParentEmail { get; set; }
        public DateTime RequestDate { get; set; }
        public string Status { get; set; } = "Pending";
        public int? CreatedStudentId { get; set; }
        public int? GradeId { get; set; }
        public string? GradeName { get; set; }
        public int? ClassId { get; set; }
        public string? ClassName { get; set; }
        public string RequestType { get; set; } = "GuestRegistration";
    }
}
