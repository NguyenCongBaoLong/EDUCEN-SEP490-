using System.Collections.Generic;

namespace EducenAPI.DTOs.Students
{
    public static class ImportTemplate
    {
        public const string TEMPLATE_NAME = "Student Import Template";

        // Required headers (case-insensitive)
        public static readonly List<string> REQUIRED_HEADERS = new List<string>
        {
            "username",
            "fullname",
            "email",
            "phonenumber",
            "grade",
            "dateofbirth",
            "gender"
        };

        // Header mapping for variations
        public static readonly Dictionary<string, string> HEADER_MAPPING = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "username", "Username" },
            { "user name", "Username" },
            { "fullname", "FullName" },
            { "full name", "FullName" },
            { "name", "FullName" },
            { "email", "Email" },
            { "email address", "Email" },
            { "phonenumber", "PhoneNumber" },
            { "phone number", "PhoneNumber" },
            { "phone", "PhoneNumber" },
            { "mobile", "PhoneNumber" },
            { "grade", "Grade" },
            { "class", "Grade" },
            { "level", "Grade" },
            { "dateofbirth", "DateOfBirth" },
            { "date of birth", "DateOfBirth" },
            { "dob", "DateOfBirth" },
            { "birthdate", "DateOfBirth" },
            { "birth date", "DateOfBirth" },
            { "gender", "Gender" },
            { "sex", "Gender" }
        };

        // Validate template headers
        public static ValidationResult ValidateHeaders(List<string> actualHeaders)
        {
            var normalizedActualHeaders = actualHeaders
                .Select(h => h?.Trim().ToLower() ?? "")
                .ToList();

            var missingHeaders = REQUIRED_HEADERS
                .Where(required => !normalizedActualHeaders.Contains(required))
                .ToList();

            if (missingHeaders.Any())
            {
                return ValidationResult.Invalid($"Missing required headers: {string.Join(", ", missingHeaders)}");
            }

            return ValidationResult.Valid();
        }

        public sealed class ValidationResult
        {
            public bool IsValid { get; }
            public string ErrorMessage { get; }

            private ValidationResult(bool isValid, string errorMessage = null)
            {
                IsValid = isValid;
                ErrorMessage = errorMessage;
            }

            public static ValidationResult Valid() => new ValidationResult(true);
            public static ValidationResult Invalid(string message) => new ValidationResult(false, message);
        }
    }
}
