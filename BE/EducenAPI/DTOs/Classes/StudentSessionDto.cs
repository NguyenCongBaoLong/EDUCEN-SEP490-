using System.Collections.Generic;
using EducenAPI.DTOs.LessionMaterials;
using EducenAPI.DTOs.Classes;

namespace EducenAPI.DTOs.Classes
{
    public class StudentSessionDto : SessionResponseDto
    {
        public List<MaterialResponseDto> Materials { get; set; } = new();
        public List<EducenAPI.DTOs.Assignments.StudentAssignmentDto> Assignments { get; set; } = new();
    }
}
