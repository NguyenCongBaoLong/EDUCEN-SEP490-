using EducenAPI.DTOs.Grades;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class GradeService : IGradeService
    {
        private readonly EducenV2Context _context;

        public GradeService(EducenV2Context context)
        {
            _context = context;
        }

        public async Task<IEnumerable<GradeDto>> GetAllGradesAsync()
        {
            return await _context.Grades
                .Select(g => new GradeDto
                {
                    GradeId = g.GradeId,
                    GradeName = g.GradeName
                })
                .ToListAsync();
        }

        public async Task<GradeDto?> GetGradeByIdAsync(int id)
        {
            var grade = await _context.Grades.FindAsync(id);
            if (grade == null) return null;

            return new GradeDto
            {
                GradeId = grade.GradeId,
                GradeName = grade.GradeName
            };
        }

        public async Task<GradeDto> CreateGradeAsync(CreateGradeDto dto)
        {
            var grade = new Grade
            {
                GradeName = dto.GradeName
            };

            _context.Grades.Add(grade);
            await _context.SaveChangesAsync();

            return new GradeDto
            {
                GradeId = grade.GradeId,
                GradeName = grade.GradeName
            };
        }

        public async Task<bool> UpdateGradeAsync(int id, UpdateGradeDto dto)
        {
            var grade = await _context.Grades.FindAsync(id);
            if (grade == null) return false;

            grade.GradeName = dto.GradeName;

            _context.Grades.Update(grade);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteGradeAsync(int id)
        {
            var grade = await _context.Grades.FindAsync(id);
            if (grade == null) return false;

            // Check if grade is used in any class
            var isUsed = await _context.Classes.AnyAsync(c => c.GradeId == id);
            if (isUsed)
            {
                throw new InvalidOperationException("Không thể xóa khối/lớp vì đang được sử dụng cho một hoặc nhiều lớp học.");
            }

            _context.Grades.Remove(grade);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
