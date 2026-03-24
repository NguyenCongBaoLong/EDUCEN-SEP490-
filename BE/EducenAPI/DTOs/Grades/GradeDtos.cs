namespace EducenAPI.DTOs.Grades
{
    public class GradeDto
    {
        public int GradeId { get; set; }
        public string GradeName { get; set; } = string.Empty;
    }

    public class CreateGradeDto
    {
        public string GradeName { get; set; } = string.Empty;
    }

    public class UpdateGradeDto : CreateGradeDto
    {
    }
}
