using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Teachers
{
    public class CreateTeacherDto
    {
        private string? _username;
        private string? _password;
        private string _fullName = string.Empty;
        private string _email = string.Empty;
        private string? _phoneNumber;
        private string _specialization = string.Empty;
        private string? _degree;

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

        [Phone(ErrorMessage = "Invalid phone number format")]
        [StringLength(20, ErrorMessage = "Phone number cannot exceed 20 characters")]
        public string? PhoneNumber 
        { 
            get => _phoneNumber;
            set => _phoneNumber = value?.Trim();
        }

        [Required(ErrorMessage = "Specialization is required")]
        [StringLength(100, ErrorMessage = "Specialization cannot exceed 100 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Specialization cannot be only whitespace")]
        public string Specialization 
        { 
            get => _specialization;
            set => _specialization = value?.Trim() ?? string.Empty;
        }

        [StringLength(100, ErrorMessage = "Degree cannot exceed 100 characters")]
        public string? Degree 
        { 
            get => _degree;
            set => _degree = value?.Trim();
        }
    }

    public class UpdateTeacherDto
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

        [StringLength(100, ErrorMessage = "Specialization cannot exceed 100 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Specialization cannot be only whitespace")]
        public string? Specialization { get; set; }

        [StringLength(100, ErrorMessage = "Degree cannot exceed 100 characters")]
        public string? Degree { get; set; }
    }

    public class TeacherDto
    {
        public int TeacherId { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string Specialization { get; set; } = string.Empty;
        public string? Degree { get; set; }
        public string AccountStatus { get; set; } = string.Empty;
        public int ClassesCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
