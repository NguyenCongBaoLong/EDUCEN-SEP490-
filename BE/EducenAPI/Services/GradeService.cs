using EducenAPI.DTOs.Grades;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;

namespace EducenAPI.Services
{
    public class GradeService : IGradeService
    {
        private readonly EducenV2Context _context;
        private static readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();
        private const int MaxGradeNameLength = 100;

        public GradeService(EducenV2Context context)
        {
            _context = context;
        }

        private SemaphoreSlim GetLock(string key)
        {
            return _locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
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
            if (grade == null)
            {
                return null;
            }

            return new GradeDto
            {
                GradeId = grade.GradeId,
                GradeName = grade.GradeName
            };
        }

        public async Task<GradeDto> CreateGradeAsync(CreateGradeDto dto)
        {
            dto.GradeName = dto.GradeName?.Trim();

            if (string.IsNullOrWhiteSpace(dto.GradeName))
            {
                throw new ArgumentException("Tên khối lớp không được để trống.");
            }

            if (dto.GradeName.Length > MaxGradeNameLength)
            {
                throw new ArgumentException($"Tên khối lớp không được vượt quá {MaxGradeNameLength} ký tự.");
            }

            var normalizedName = dto.GradeName.ToLowerInvariant();
            var lockObj = GetLock($"grade_{normalizedName}");

            await lockObj.WaitAsync();
            try
            {
                var exists = await _context.Grades.AnyAsync(g => g.GradeName.ToLower() == normalizedName);
                if (exists)
                {
                    throw new InvalidOperationException("Tên khối lớp đã tồn tại.");
                }

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
            finally
            {
                lockObj.Release();
            }
        }

        public async Task<bool> UpdateGradeAsync(int id, UpdateGradeDto dto)
        {
            var grade = await _context.Grades.FindAsync(id);
            if (grade == null)
            {
                return false;
            }

            dto.GradeName = dto.GradeName?.Trim();
            if (string.IsNullOrWhiteSpace(dto.GradeName))
            {
                throw new ArgumentException("Tên khối lớp không được để trống.");
            }

            if (dto.GradeName.Length > MaxGradeNameLength)
            {
                throw new ArgumentException($"Tên khối lớp không được vượt quá {MaxGradeNameLength} ký tự.");
            }

            var normalizedName = dto.GradeName.ToLowerInvariant();
            var duplicateExists = await _context.Grades
                .AnyAsync(g => g.GradeName.ToLower() == normalizedName && g.GradeId != id);
            if (duplicateExists)
            {
                throw new InvalidOperationException("Tên khối lớp đã tồn tại.");
            }

            grade.GradeName = dto.GradeName;

            _context.Grades.Update(grade);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteGradeAsync(int id)
        {
            var grade = await _context.Grades.FindAsync(id);
            if (grade == null)
            {
                return false;
            }

            var isUsedByClasses = await _context.Classes.AnyAsync(c => c.GradeId == id);
            var normalizedGradeName = grade.GradeName.Trim().ToLower();
            var isUsedByStudents = await _context.Students.AnyAsync(s =>
                s.GradeId == id ||
                (s.Grade != null && s.Grade.Trim().ToLower() == normalizedGradeName));

            if (isUsedByClasses || isUsedByStudents)
            {
                throw new InvalidOperationException("Không thể xóa khối lớp vì đang được sử dụng bởi các lớp học hoặc học sinh hiện có.");
            }

            _context.Grades.Remove(grade);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
