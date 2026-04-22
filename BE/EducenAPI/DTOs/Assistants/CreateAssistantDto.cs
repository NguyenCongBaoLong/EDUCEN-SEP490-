using System.ComponentModel.DataAnnotations;
using EducenAPI.DTOs.Classes;

namespace EducenAPI.DTOs.Assistants
{
    public class CreateAssistantDto
    {
        private string? _username;
        private string? _password;
        private string _fullName = string.Empty;
        private string _email = string.Empty;
        private string? _phoneNumber;
        private string? _supportLevel;

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
        [RegularExpression(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", ErrorMessage = "Email format is invalid")]
        [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        public string Email 
        { 
            get => _email;
            set => _email = value?.Trim() ?? string.Empty;
        }

        [Phone(ErrorMessage = "Định dạng số điện thoại không hợp lệ")]
        [RegularExpression(@"^\d{10}$", ErrorMessage = "Số điện thoại phải có đúng 10 chữ số")]
        public string? PhoneNumber 
        { 
            get => _phoneNumber;
            set => _phoneNumber = value?.Trim();
        }

        [StringLength(50, ErrorMessage = "SupportLevel cannot exceed 50 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "SupportLevel cannot be only whitespace")]
        public string? SupportLevel 
        { 
            get => _supportLevel;
            set => _supportLevel = value?.Trim();
        }
        public string? Address { get; set; }
    }

    public class UpdateAssistantDto
    {
        [StringLength(100, ErrorMessage = "FullName cannot exceed 100 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "FullName cannot be only whitespace")]
        public string? FullName { get; set; }

        [RegularExpression(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", ErrorMessage = "Email format is invalid")]
        [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        public string? Email { get; set; }

        [Phone(ErrorMessage = "Định dạng số điện thoại không hợp lệ")]
        [RegularExpression(@"^\d{10}$", ErrorMessage = "Số điện thoại phải có đúng 10 chữ số")]
        public string? PhoneNumber { get; set; }

        [StringLength(50, ErrorMessage = "SupportLevel cannot exceed 50 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "SupportLevel cannot be only whitespace")]
        public string? SupportLevel { get; set; }
        public string? Address { get; set; }
    }

    public class AssistantDto
    {
        public int AssistantId { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public string? SupportLevel { get; set; }
        public string AccountStatus { get; set; } = string.Empty;
        public bool IsAccountSent { get; set; }
        public int AssignedClassesCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<CreateScheduleSlotDto> Schedule { get; set; } = new();
    }
}
