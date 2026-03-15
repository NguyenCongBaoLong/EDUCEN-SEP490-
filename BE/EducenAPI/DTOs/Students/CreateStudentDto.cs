using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Students
{
    public class CreateStudentDto
    {
        private string? _username;
        private string? _password;
        private string _fullName = string.Empty;
        private string _email = string.Empty;
        private string? _phoneNumber;
        private string? _enrollmentStatus;

        [Required(ErrorMessage = "FullName is required")]
        [StringLength(100, ErrorMessage = "FullName cannot exceed 100 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "FullName cannot be only whitespace")]
        public string FullName 
        { 
            get => _fullName;
            set => _fullName = value?.Trim() ?? string.Empty;
        }

        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Email cannot be only whitespace")]
        public string Email 
        { 
            get => _email;
            set => _email = value?.Trim() ?? string.Empty;
        }

        [StringLength(50, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 50 characters")]
        public string? Username 
        { 
            get => _username;
            set => _username = value?.Trim();
        }

        [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be at least 6 characters")]
        public string? Password 
        { 
            get => _password;
            set => _password = value?.Trim();
        }

        [Phone(ErrorMessage = "Invalid phone number format")]
        [StringLength(20, ErrorMessage = "Phone number cannot exceed 20 characters")]
        public string? PhoneNumber 
        { 
            get => _phoneNumber;
            set => _phoneNumber = value?.Trim();
        }

        [StringLength(50, ErrorMessage = "Enrollment status cannot exceed 50 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Enrollment status cannot be only whitespace")]
        public string? EnrollmentStatus 
        { 
            get => _enrollmentStatus;
            set => _enrollmentStatus = value?.Trim();
        }

        public string? Grade { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
    }

    public class UpdateStudentDto
    {
        [StringLength(100, ErrorMessage = "FullName cannot exceed 100 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "FullName cannot be only whitespace")]
        public string? FullName { get; set; }

        [EmailAddress(ErrorMessage = "Invalid email format")]
        [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Email cannot be only whitespace")]
        public string? Email { get; set; }

        [Phone(ErrorMessage = "Invalid phone number format")]
        [StringLength(20, ErrorMessage = "Phone number cannot exceed 20 characters")]
        public string? PhoneNumber { get; set; }

        [StringLength(50, ErrorMessage = "Enrollment status cannot exceed 50 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Enrollment status cannot be only whitespace")]
        public string? EnrollmentStatus { get; set; }

        public string? Grade { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
    }

    public class StudentDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public string? Grade { get; set; }
        public string EnrollmentStatus { get; set; } = string.Empty;
        public string AccountStatus { get; set; } = string.Empty;
        public bool IsAccountSent { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
