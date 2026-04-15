using System.Collections.Generic;

namespace EducenAPI.DTOs.Classes
{
    public class StudentClassDetailDto
    {
        public ClassDto ClassInfo { get; set; } = null!;
        public List<StudentSessionDto> Sessions { get; set; } = new();
    }
}
