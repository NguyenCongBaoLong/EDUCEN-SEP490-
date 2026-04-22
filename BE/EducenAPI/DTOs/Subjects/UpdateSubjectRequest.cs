using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Subjects
{
    public class UpdateSubjectRequest
    {
        [Required(ErrorMessage = "Tên môn học là bắt buộc")]
        [StringLength(100, ErrorMessage = "Tên môn học không được vượt quá 100 ký tự")]
        public string SubjectName { get; set; } = string.Empty;

        [StringLength(255, ErrorMessage = "Mô tả không được vượt quá 255 ký tự")]
        public string? Description { get; set; }
    }
}

