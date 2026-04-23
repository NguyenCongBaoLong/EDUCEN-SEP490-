using EducenAPI.DTOs.Subjects;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class SubjectService : ISubjectService
    {
        private readonly EducenV2Context _context;
        private const int MaxSubjectNameLength = 100;

        public SubjectService(EducenV2Context context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Subject>> GetAllSubjectsAsync()
        {
            return await _context.Subjects.ToListAsync();
        }

        public async Task<Subject?> GetSubjectByIdAsync(int id)
        {
            return await _context.Subjects.FindAsync(id);
        }

        public async Task<Subject> CreateSubjectAsync(CreateSubjectRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.SubjectName))
            {
                throw new Exception("Tên môn học không được để trống.");
            }

            var name = request.SubjectName.Trim();
            if (name.Length > MaxSubjectNameLength)
            {
                throw new Exception($"Tên môn học không được vượt quá {MaxSubjectNameLength} ký tự.");
            }

            var exists = await _context.Subjects.AnyAsync(s => s.SubjectName == name);
            if (exists)
            {
                throw new Exception("Tên môn học đã tồn tại.");
            }

            var subject = new Subject
            {
                SubjectName = name,
                Description = request.Description?.Trim()
            };

            _context.Subjects.Add(subject);
            await _context.SaveChangesAsync();

            return subject;
        }

        public async Task<bool> UpdateSubjectAsync(int id, UpdateSubjectRequest request)
        {
            var existingSubject = await _context.Subjects.FindAsync(id);
            if (existingSubject == null)
            {
                return false;
            }

            if (string.IsNullOrWhiteSpace(request.SubjectName))
            {
                throw new Exception("Tên môn học không được để trống.");
            }

            var name = request.SubjectName.Trim();
            if (name.Length > MaxSubjectNameLength)
            {
                throw new Exception($"Tên môn học không được vượt quá {MaxSubjectNameLength} ký tự.");
            }

            var description = request.Description?.Trim();

            var isDuplicate = await _context.Subjects.AnyAsync(s => s.SubjectName == name && s.SubjectId != id);
            if (isDuplicate)
            {
                throw new Exception("Tên môn học đã tồn tại.");
            }

            existingSubject.SubjectName = name;
            existingSubject.Description = description;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteSubjectAsync(int id)
        {
            var subject = await _context.Subjects.FindAsync(id);
            if (subject == null)
            {
                return false;
            }

            var isUsed = await IsSubjectUsedInClassesAsync(id);
            if (isUsed)
            {
                throw new Exception("Không thể xóa môn học vì đang được sử dụng bởi một hoặc nhiều lớp học.");
            }

            _context.Subjects.Remove(subject);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> IsSubjectUsedInClassesAsync(int id)
        {
            return await _context.Classes.AnyAsync(c => c.SubjectId == id);
        }
    }
}