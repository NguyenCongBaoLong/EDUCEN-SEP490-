using EducenAPI.DTOs.Classes;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class ClassService : IClassService
    {
        private readonly EducenV2Context _context;

        public ClassService(EducenV2Context context)
        {
            _context = context;
        }

        public async Task<IEnumerable<ClassDto>> GetAllClassesAsync()
        {
            return await _context.Classes
                .Include(c => c.Subject)
                .Include(c => c.Teacher)
                    .ThenInclude(t => t!.TeacherNavigation)
                .Include(c => c.Assistant)
                    .ThenInclude(a => a!.AssistantNavigation)
                .Include(c => c.Students)
                .Select(c => new ClassDto
                {
                    ClassId = c.ClassId,
                    ClassName = c.ClassName ?? "",
                    Description = c.Description,
                    SyllabusContent = c.SyllabusContent,
                    SubjectId = c.SubjectId,
                    SubjectName = c.Subject.SubjectName,
                    TeacherId = c.TeacherId,
                    TeacherName = c.Teacher != null ? c.Teacher.TeacherNavigation.FullName : null,
                    AssistantId = c.AssistantId,
                    AssistantName = c.Assistant != null ? c.Assistant.AssistantNavigation.FullName : null,
                    //StartDate = c.StartDate,
                    //EndDate = c.EndDate,
                    Status = c.Status,
                    StudentCount = c.Students.Count,
                    CreatedAt = DateTime.Now
                })
                .ToListAsync();
        }

        public async Task<ClassDto?> GetClassByIdAsync(int id)
        {
            return await _context.Classes
                .Include(c => c.Subject)
                .Include(c => c.Teacher)
                    .ThenInclude(t => t!.TeacherNavigation)
                .Include(c => c.Assistant)
                    .ThenInclude(a => a!.AssistantNavigation)
                .Include(c => c.Students)
                .Where(c => c.ClassId == id)
                .Select(c => new ClassDto
                {
                    ClassId = c.ClassId,
                    ClassName = c.ClassName ?? "",
                    Description = c.Description,
                    SyllabusContent = c.SyllabusContent,
                    SubjectId = c.SubjectId,
                    SubjectName = c.Subject.SubjectName,
                    TeacherId = c.TeacherId,
                    TeacherName = c.Teacher != null ? c.Teacher.TeacherNavigation.FullName : null,
                    AssistantId = c.AssistantId,
                    AssistantName = c.Assistant != null ? c.Assistant.AssistantNavigation.FullName : null,
                    //StartDate = c.StartDate,
                    //EndDate = c.EndDate,
                    Status = c.Status,
                    StudentCount = c.Students.Count,
                    CreatedAt = DateTime.Now
                })
                .FirstOrDefaultAsync();
        }

        public async Task<ClassDto> CreateClassAsync(CreateClassDto dto)
        {
            var subject = await _context.Subjects.FindAsync(dto.SubjectId);
            if (subject == null)
                throw new Exception("Subject not found");

            if (dto.TeacherId.HasValue)
            {
                var teacher = await _context.Teachers.FindAsync(dto.TeacherId.Value);
                if (teacher == null)
                    throw new Exception("Teacher not found");
            }

            if (dto.AssistantId.HasValue)
            {
                var assistant = await _context.Assistants.FindAsync(dto.AssistantId.Value);
                if (assistant == null)
                    throw new Exception("Assistant not found");
            }

            var newClass = new Class
            {
                ClassName = dto.ClassName,
                Description = dto.Description,
                SyllabusContent = dto.SyllabusContent,
                SubjectId = dto.SubjectId,
                TeacherId = dto.TeacherId,
                AssistantId = dto.AssistantId,
                //StartDate = dto.StartDate,
                //EndDate = dto.EndDate,
                Status = dto.Status ?? "Active"
            };

            _context.Classes.Add(newClass);
            await _context.SaveChangesAsync();

            return await GetClassByIdAsync(newClass.ClassId) ?? throw new Exception("Failed to retrieve created class");
        }

        public async Task<bool> UpdateClassAsync(int id, UpdateClassDto dto)
        {
            var existingClass = await _context.Classes.FindAsync(id);
            if (existingClass == null)
                return false;

            if (dto.ClassName != null)
                existingClass.ClassName = dto.ClassName;

            if (dto.Description != null)
                existingClass.Description = dto.Description;

            if (dto.SyllabusContent != null)
                existingClass.SyllabusContent = dto.SyllabusContent;

            if (dto.SubjectId.HasValue)
            {
                var subject = await _context.Subjects.FindAsync(dto.SubjectId.Value);
                if (subject == null)
                    throw new Exception("Subject not found");
                existingClass.SubjectId = dto.SubjectId.Value;
            }

            if (dto.TeacherId.HasValue)
            {
                var teacher = await _context.Teachers.FindAsync(dto.TeacherId.Value);
                if (teacher == null)
                    throw new Exception("Teacher not found");
                existingClass.TeacherId = dto.TeacherId;
            }

            if (dto.AssistantId.HasValue)
            {
                var assistant = await _context.Assistants.FindAsync(dto.AssistantId.Value);
                if (assistant == null)
                    throw new Exception("Assistant not found");
                existingClass.AssistantId = dto.AssistantId;
            }

            if (dto.StartDate.HasValue)
                existingClass.StartDate = dto.StartDate;

            if (dto.EndDate.HasValue)
                existingClass.EndDate = dto.EndDate;

            if (dto.Status != null)
                existingClass.Status = dto.Status;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteClassAsync(int id)
        {
            var existingClass = await _context.Classes
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.ClassId == id);

            if (existingClass == null)
                return false;

            if (existingClass.Students.Any())
                throw new Exception("Cannot delete class: class has students enrolled");

            _context.Classes.Remove(existingClass);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> AssignTeacherAsync(int classId, int teacherId)
        {
            var existingClass = await _context.Classes.FindAsync(classId);
            if (existingClass == null)
                return false;

            var teacher = await _context.Teachers.FindAsync(teacherId);
            if (teacher == null)
                throw new Exception("Teacher not found");

            existingClass.TeacherId = teacherId;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> AssignAssistantAsync(int classId, int assistantId)
        {
            var existingClass = await _context.Classes.FindAsync(classId);
            if (existingClass == null)
                return false;

            var assistant = await _context.Assistants.FindAsync(assistantId);
            if (assistant == null)
                throw new Exception("Assistant not found");

            existingClass.AssistantId = assistantId;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> AddStudentToClassAsync(int classId, int studentId)
        {
            var existingClass = await _context.Classes
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.ClassId == classId);

            if (existingClass == null)
                return false;

            var student = await _context.Students.FindAsync(studentId);
            if (student == null)
                throw new Exception("Student not found");

            if (existingClass.Students.Any(s => s.UserId == studentId))
                throw new Exception("Student already enrolled in this class");

            existingClass.Students.Add(student);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RemoveStudentFromClassAsync(int classId, int studentId)
        {
            var existingClass = await _context.Classes
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.ClassId == classId);

            if (existingClass == null)
                return false;

            var student = existingClass.Students.FirstOrDefault(s => s.UserId == studentId);
            if (student == null)
                throw new Exception("Student not enrolled in this class");

            existingClass.Students.Remove(student);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
