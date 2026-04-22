using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Profile
{
    public class UpdateProfileRequest
    {
        [StringLength(50, MinimumLength = 3, ErrorMessage = "Ten dang nhap phai tu 3 den 50 ky tu")]
        public string? Username { get; set; }

        [StringLength(100, ErrorMessage = "Ho va ten khong duoc qua 100 ky tu")]
        [RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Ho va ten khong duoc de trong hoac chi co khoang trang")]
        public string? FullName { get; set; }

        [EmailAddress(ErrorMessage = "Dinh dang email khong hop le")]
        [StringLength(100, ErrorMessage = "Email khong duoc qua 100 ky tu")]
        public string? Email { get; set; }

        [RegularExpression(@"^(0|\+84)[0-9]{9,10}$", ErrorMessage = "So dien thoai khong hop le. Phai bat dau bang 0 hoac +84 va co 10-11 chu so.")]
        [StringLength(20, ErrorMessage = "So dien thoai khong duoc qua 20 ky tu")]
        public string? PhoneNumber { get; set; }

        [StringLength(200, ErrorMessage = "Dia chi khong duoc qua 200 ky tu")]
        public string? Address { get; set; }

        [StringLength(100, ErrorMessage = "Chuyen mon khong duoc qua 100 ky tu")]
        [RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Chuyen mon khong duoc chi co khoang trang")]
        public string? Specialization { get; set; }

        [StringLength(100, ErrorMessage = "Bang cap khong duoc qua 100 ky tu")]
        [RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Bang cap khong duoc chi co khoang trang")]
        public string? Degree { get; set; }

        [StringLength(50, ErrorMessage = "Cap ho tro khong duoc qua 50 ky tu")]
        [RegularExpression(@"^(?!\s+$).+", ErrorMessage = "Cap ho tro khong duoc chi co khoang trang")]
        public string? SupportLevel { get; set; }

        public DateTime? DateOfBirth { get; set; }

        [StringLength(10, ErrorMessage = "Gioi tinh khong duoc qua 10 ky tu")]
        public string? Gender { get; set; }
    }
}
