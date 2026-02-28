using EducenAPI.DTOs;
using EducenAPI.Models;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class SubjectService : ISubjectService
    {
        private readonly EducenV2Context _context;

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
            var subject = new Subject
            {
                SubjectName = request.SubjectName,
                Description = request.Description
            };

            _context.Subjects.Add(subject);
            await _context.SaveChangesAsync();

            return subject;
        }

        public async Task<bool> UpdateSubjectAsync(int id, UpdateSubjectRequest request)
        {
            var existingSubject = await _context.Subjects.FindAsync(id);
            if (existingSubject == null)
                return false;

            existingSubject.SubjectName = request.SubjectName;
            existingSubject.Description = request.Description;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteSubjectAsync(int id)
        {
            var subject = await _context.Subjects.FindAsync(id);
            if (subject == null)
                return false;

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
