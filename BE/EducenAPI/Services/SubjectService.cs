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
                throw new Exception("Subject name cannot be empty.");

            var name = request.SubjectName.Trim();

            var exists = await _context.Subjects
                .AnyAsync(s => s.SubjectName == name);

            if (exists)
                throw new Exception("Subject name already exists.");

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
                return false;

            // Validate name
            if (string.IsNullOrWhiteSpace(request.SubjectName))
                throw new Exception("Subject name cannot be empty.");

            var name = request.SubjectName.Trim();
            var description = request.Description?.Trim();

            // Check duplicate (exclude current subject)
            var isDuplicate = await _context.Subjects
                .AnyAsync(s => s.SubjectName == name && s.SubjectId != id);

            if (isDuplicate)
                throw new Exception("Subject name already exists.");

            // Update fields
            existingSubject.SubjectName = name;
            existingSubject.Description = description;

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
