using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Invoice
{
    public class CreateFamilyInvoiceRequest
    {
        public string? ParentId { get; set; }
        
        /// <summary>
        /// Loại gộp: "Student" = gộp theo 1 con, "Family" = gộp tất cả con
        /// </summary>
        [Required(ErrorMessage = "Loại hóa đơn là bắt buộc.")]
        public string Type { get; set; } = "Family"; // Student | Family
        
        [Required(ErrorMessage = "Tháng là bắt buộc.")]
        [Range(1, 12, ErrorMessage = "Tháng phải từ 1 đến 12.")]
        public int Month { get; set; }
        
        [Required(ErrorMessage = "Năm là bắt buộc.")]
        [Range(2020, 2030, ErrorMessage = "Năm phải từ 2020 đến 2030.")]
        public int Year { get; set; }
        
        /// <summary>
        /// Danh sách học sinh:
        /// - Type="Student": chứa 1 studentId (gộp hóa đơn của 1 con)
        /// - Type="Family": chứa nhiều studentIds (gộp hóa đơn tất cả con)
        /// </summary>
        [Required(ErrorMessage = "Danh sách học sinh là bắt buộc.")]
        public List<int> StudentIds { get; set; } = new();

        /// <summary>
        /// Danh sách TuitionInvoice.InvoiceId được chọn để gộp.
        /// Ưu tiên luồng mới: backend xác thực ownership + trạng thái trước khi tạo.
        /// Nếu không truyền, backend sẽ fallback sang luồng cũ dùng StudentIds + Month + Year.
        /// </summary>
        public List<string> SelectedTuitionInvoiceIds { get; set; } = new();
        
        public string? Notes { get; set; }
    }
}
