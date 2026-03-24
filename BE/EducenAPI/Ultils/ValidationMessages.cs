namespace EducenAPI.Ultils
{
    public static class ValidationMessages
    {
        // Student validation messages - consistent across import and manual add
        public const string RequiredFullName = "FullName is required";
        public const string RequiredEmail = "Email is required";
        public const string InvalidEmailFormat = "Invalid email format";
        public const string InvalidPhoneFormat = "Invalid phone number format";
        
        public const string DuplicateUsername = "Username already exists";
        public const string DuplicateEmail = "Email already exists";
        public const string EmailUsedByOtherRole = "Email is already used by another account (Teacher/Parent/Admin)";
        
        public const string RequiredUsername = "Username is required for account creation";
        public const string RequiredPassword = "Password is required for account creation";
        
        public const string MissingRequiredData = "Missing required data (Full Name, Email)";
        public const string UsernameExistsInFile = "Username already exists in import file";
        public const string UsernameExistsInSystem = "Username already exists in system";
        public const string InvalidDateFormat = "Invalid date format for DateOfBirth '{0}'. Use format: MM/DD/YYYY or DD/MM/YYYY";
        public const string DateOfBirthInFuture = "Date of birth cannot be in the future";
        
        // Format with parameter
        public static string FormatInvalidDate(string dateValue) => 
            string.Format(InvalidDateFormat, dateValue);
    }
}
