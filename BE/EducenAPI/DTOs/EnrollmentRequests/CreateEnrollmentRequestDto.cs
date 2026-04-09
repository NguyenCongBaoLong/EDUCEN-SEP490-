using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.EnrollmentRequests
{
    public class CreateEnrollmentRequestDto
    {
        [Required] public string FirstName { get; set; }
        [Required] public string LastName { get; set; }
        [Required] [EmailAddress] public string Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? PreferredCourse { get; set; }
        public string? ParentName { get; set; }
        public string? ParentPhone { get; set; }
        public string? ParentEmail { get; set; }
        public string? Message { get; set; }
        public int? GradeId { get; set; }
        public int? ClassId { get; set; }
    }
}
