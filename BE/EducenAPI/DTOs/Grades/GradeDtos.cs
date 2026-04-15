using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace EducenAPI.DTOs.Grades
{
    public class GradeDto
    {
        public int GradeId { get; set; }
        public string GradeName { get; set; } = string.Empty;
    }

    public class CreateGradeDto
    {
        [Required(ErrorMessage = "Tên khối là bắt buộc.")]
        [StringLength(100, ErrorMessage = "Tên khối không được vượt quá 100 ký tự.")]
        [NoWhitespaceOnly(ErrorMessage = "Tên khối không được chỉ chứa khoảng trắng.")]
        [NoSqlInjection(ErrorMessage = "Tên khối chứa ký tự không hợp lệ.")]
        public string GradeName { get; set; } = string.Empty;
    }

    public class UpdateGradeDto : CreateGradeDto
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
