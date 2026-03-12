using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Parents
{
    public class CreateParentDto
    {
        private string? _username;
        private string? _password;
        private string _fullName = string.Empty;
        private string _email = string.Empty;
        private string? _phoneNumber;
        private string? _address;

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

        [StringLength(200, ErrorMessage = "Address cannot exceed 200 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Address cannot be only whitespace")]
        public string? Address
        {
            get => _address;
            set => _address = value?.Trim();
        }
    }

    public class UpdateParentDto
    {
        private string? _username;
        private string? _password;
        private string? _fullName;
        private string? _email;
        private string? _phoneNumber;
        private string? _address;

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

        [StringLength(100, ErrorMessage = "FullName cannot exceed 100 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "FullName cannot be only whitespace")]
        public string? FullName
        {
            get => _fullName;
            set => _fullName = value?.Trim();
        }

        [EmailAddress(ErrorMessage = "Invalid email format")]
        [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Email cannot be only whitespace")]
        public string? Email
        {
            get => _email;
            set => _email = value?.Trim();
        }

        [Phone(ErrorMessage = "Invalid phone number format")]
        [StringLength(20, ErrorMessage = "Phone number cannot exceed 20 characters")]
        public string? PhoneNumber
        {
            get => _phoneNumber;
            set => _phoneNumber = value?.Trim();
        }

        [StringLength(200, ErrorMessage = "Address cannot exceed 200 characters")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Address cannot be only whitespace")]
        public string? Address
        {
            get => _address;
            set => _address = value?.Trim();
        }
    }

    public class ParentDto
    {
        public int ParentId { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public string AccountStatus { get; set; } = string.Empty;
        public int ChildrenCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
