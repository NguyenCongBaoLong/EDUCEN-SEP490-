using System;
using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models
{
    public class EnrollmentRequest 
    {
        [Key]
        public int RequestId { get; set; }

        [Required]
        [MaxLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(100)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [Phone]
        [MaxLength(20)]
        public string Phone { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? PreferredCourse { get; set; }

        [MaxLength(1000)]
        public string? Address { get; set; }

        [MaxLength(100)]
        public string? ParentName { get; set; }

        [MaxLength(20)]
        public string? ParentPhone { get; set; }

        [MaxLength(100)]
        [EmailAddress]
        public string? ParentEmail { get; set; }

        public DateTime RequestDate { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Status: Pending, Approved, Rejected
        /// </summary>
        [MaxLength(20)]
        public string Status { get; set; } = "Pending";

        /// <summary>
        /// Student ID created if approved
        /// </summary>
        public int? CreatedStudentId { get; set; }

        public int? GradeId { get; set; }
        public int? ClassId { get; set; }

        /// <summary>
        /// RequestType: GuestRegistration, ExistingStudentEnrollment
        /// </summary>
        [MaxLength(50)]
        public string RequestType { get; set; } = "GuestRegistration";
    }
}
