namespace EducenAPI.Ultils
{
    public static class ValidationMessages
    {
        // Student validation messages - consistent across import and manual add
        public const string RequiredFullName = "Họ và tên là bắt buộc.";
        public const string RequiredEmail = "Email là bắt buộc.";
        public const string InvalidEmailFormat = "Định dạng email không hợp lệ.";
        public const string InvalidPhoneFormat = "Định dạng số điện thoại không hợp lệ.";
        
        public const string DuplicateUsername = "Tên đăng nhập đã tồn tại.";
        public const string DuplicateEmail = "Email đã tồn tại.";
        public const string EmailUsedByOtherRole = "Email này đã được sử dụng bởi một tài khoản khác (Giáo viên/Phụ huynh/Quản trị viên).";
        
        public const string RequiredUsername = "Tên đăng nhập là bắt buộc khi tạo tài khoản.";
        public const string RequiredPassword = "Mật khẩu là bắt buộc khi tạo tài khoản.";
        
        public const string MissingRequiredData = "Thiếu dữ liệu bắt buộc (Họ tên, Email).";
        public const string UsernameExistsInFile = "Tên đăng nhập đã tồn tại trong tệp nhập liệu.";
        public const string UsernameExistsInSystem = "Tên đăng nhập đã tồn tại trong hệ thống.";
        public const string InvalidDateFormat = "Định dạng ngày sinh không hợp lệ cho '{0}'. Vui lòng sử dụng định dạng: MM/DD/YYYY hoặc DD/MM/YYYY.";
        public const string DateOfBirthInFuture = "Ngày sinh không thể ở trong tương lai.";
        
        public const string DuplicateParentPhone = "Số điện thoại phụ huynh đã tồn tại trong hệ thống.";
        public const string DuplicateParentEmail = "Email phụ huynh đã tồn tại trong hệ thống.";
        public const string InvalidParentPhoneFormat = "Định dạng số điện thoại phụ huynh không hợp lệ.";
        public const string InvalidParentEmailFormat = "Định dạng email phụ huynh không hợp lệ.";
        
        // Format with parameter
        public static string FormatInvalidDate(string dateValue) => 
            string.Format(InvalidDateFormat, dateValue);
    }
}