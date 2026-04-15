using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Profile
{
    public class UpdateProfileRequest
    {
        [StringLength(50, MinimumLength = 3, ErrorMessage = "Tên đăng nhập phải từ 3 đến 50 ký tự")]
        public string? Username { get; set; }
 
        [StringLength(100, ErrorMessage = "Họ và tên không được quá 100 ký tự")]
        [RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Họ và tên không được để trống hoặc chỉ có khoảng trắng")]
        public string? FullName { get; set; }
 
        [EmailAddress(ErrorMessage = "Định dạng email không hợp lệ")]
        [StringLength(100, ErrorMessage = "Email không được quá 100 ký tự")]
        public string? Email { get; set; }
 
        [Phone(ErrorMessage = "Định dạng số điện thoại không hợp lệ")]
        [RegularExpression(@"^\d{9,10}$", ErrorMessage = "Số điện thoại phải là 10 hoặc 9 chữ số")]
        [StringLength(20, ErrorMessage = "Số điện thoại không được quá 20 ký tự")]
        public string? PhoneNumber { get; set; }
 
        [StringLength(200, ErrorMessage = "Địa chỉ không được quá 200 ký tự")]
        public string? Address { get; set; }

        // Teacher fields
        [StringLength(100, ErrorMessage = "Chuyên môn không được quá 100 ký tự")]
        [RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Chuyên môn không được chỉ có khoảng trắng")]
        public string? Specialization { get; set; }

        [StringLength(100, ErrorMessage = "Bằng cấp không được quá 100 ký tự")]
        [RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Bằng cấp không được chỉ có khoảng trắng")]
        public string? Degree { get; set; }

        // Assistant fields
        [StringLength(50, ErrorMessage = "Cấp hỗ trợ không được quá 50 ký tự")]
        [RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Cấp hỗ trợ không được chỉ có khoảng trắng")]
        public string? SupportLevel { get; set; }

        // Student fields
        public DateTime? DateOfBirth { get; set; }

        [StringLength(10, ErrorMessage = "Giới tính không được quá 10 ký tự")]
        public string? Gender { get; set; }
    }
}
