using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace EducenAPI.DTOs.Rooms
{
    public class RoomDto
    {
        public int RoomId { get; set; }
        public string RoomName { get; set; } = string.Empty;
        public bool Status { get; set; }
    }

    public class CreateRoomDto
    {
        [Required(ErrorMessage = "Tên phòng là bắt buộc.")]
        [StringLength(100, ErrorMessage = "Tên phòng không được vượt quá 100 ký tự.")]
        [NoWhitespaceOnly(ErrorMessage = "Tên phòng không được chỉ chứa khoảng trắng.")]
        [NoSqlInjection(ErrorMessage = "Tên phòng chứa ký tự không hợp lệ.")]
        public string RoomName { get; set; } = string.Empty;
        public bool Status { get; set; } = true;
    }

    public class UpdateRoomDto : CreateRoomDto
    {
    }

    public class NoWhitespaceOnlyAttribute : ValidationAttribute
    {
        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            if (value is string str && string.IsNullOrWhiteSpace(str))
            {
                return new ValidationResult(ErrorMessage);
            }
            return ValidationResult.Success;
        }
    }

    public class NoSqlInjectionAttribute : ValidationAttribute
    {
        private static readonly Regex SqlInjectionPattern = new Regex(
            @"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|--|;|'|\/\*|\*\/)\b)",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            if (value is string str && SqlInjectionPattern.IsMatch(str))
            {
                return new ValidationResult(ErrorMessage);
            }
            return ValidationResult.Success;
        }
    }
}
