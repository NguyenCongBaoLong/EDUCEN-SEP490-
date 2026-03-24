// using System;
// using System.ComponentModel.DataAnnotations;

// namespace EducenAPI.Models
// {
//     public class EnrollmentRequest : IMustHaveTenant
//     {
//         [Key]
//         public int RequestId { get; set; }

//         [Required]
//         [MaxLength(100)]
//         public string FirstName { get; set; } = string.Empty;

//         [Required]
//         [MaxLength(50)]
//         public string LastName { get; set; } = string.Empty;

//         [Required]
//         [EmailAddress]
//         [MaxLength(100)]
//         public string Email { get; set; } = string.Empty;

//         [Required]
//         [Phone]
//         [MaxLength(20)]
//         public string Phone { get; set; } = string.Empty;

//         [MaxLength(255)]
//         public string? PreferredCourse { get; set; }

//         [MaxLength(1000)]
//         public string? Address { get; set; }

//         public DateTime RequestDate { get; set; } = DateTime.UtcNow;

//         /// <summary>
//         /// Status: Pending, Approved, Rejected
//         /// </summary>
//         [MaxLength(20)]
//         public string Status { get; set; } = "Pending";

//         public DateTime? ReviewedAt { get; set; }

//         public int? ReviewedBy { get; set; }

//         [MaxLength(500)]
//         public string? RejectionReason { get; set; }

//         /// <summary>
//         /// Student ID created if approved
//         /// </summary>
//         public int? CreatedStudentId { get; set; }

//         // Tenant ID for multi-tenancy
//         public string TenantId { get; set; } = string.Empty;
//     }
// }
