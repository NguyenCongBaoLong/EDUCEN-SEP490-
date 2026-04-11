using System.ComponentModel.DataAnnotations;

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
        public string GradeName { get; set; } = string.Empty;
    }

    public class UpdateGradeDto : CreateGradeDto
    {
    }
}
