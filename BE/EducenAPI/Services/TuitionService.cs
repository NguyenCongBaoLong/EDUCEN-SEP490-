using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class TuitionService : ITuitionService
    {
        private readonly EducenV2Context _context;
        private readonly ILogger<TuitionService> _logger;

        public TuitionService(EducenV2Context context, ILogger<TuitionService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<TuitionCalculationResult> CalculateTuitionAsync(int studentId, int classId, int month, int year)
        {
            // Get class with price
            var classEntity = await _context.Classes
                .Include(c => c.Subject)
                .FirstOrDefaultAsync(c => c.ClassId == classId);

            if (classEntity == null)
                throw new Exception("Class not found");

            if (!classEntity.PricePerSession.HasValue || classEntity.PricePerSession.Value <= 0)
                throw new Exception("Class price per session is not set");

            // Get student
            var student = await _context.Students
                .Include(s => s.StudentNavigation)
                .FirstOrDefaultAsync(s => s.UserId == studentId);

            if (student == null)
                throw new Exception("Student not found");

            // Get all sessions in the month for this class
            var startOfMonth = new DateTime(year, month, 1);
            var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);

            var sessions = await _context.ClassSessions
                .Include(s => s.Attendances)
                .Where(s => s.Schedule.ClassId == classId &&
                            s.SessionDate >= startOfMonth &&
                            s.SessionDate <= endOfMonth)
                .OrderBy(s => s.SessionDate)
                .ToListAsync();

            // Calculate attendance
            var sessionDetails = new List<SessionAttendanceDetail>();
            int attended = 0, absent = 0, excused = 0;

            foreach (var session in sessions)
            {
                var attendance = session.Attendances?.FirstOrDefault(a => a.StudentId == studentId);
                var status = attendance?.Status ?? "Absent";

                if (status == "Attended") attended++;
                else if (status == "Excused") excused++;
                else absent++;

                var pricePerSession = classEntity.PricePerSession.Value;
                var amount = status == "Excused" ? 0 : (status == "Attended" ? pricePerSession : 0);

                sessionDetails.Add(new SessionAttendanceDetail
                {
                    SessionId = session.SessionId,
                    SessionDate = session.SessionDate,
                    Status = status,
                    Amount = amount
                });
            }

            var totalAmount = attended * classEntity.PricePerSession.Value;

            return new TuitionCalculationResult
            {
                StudentId = studentId,
                StudentName = student.StudentNavigation?.FullName ?? "Unknown",
                ClassId = classId,
                ClassName = classEntity.ClassName ?? $"Class {classId}",
                Month = month,
                Year = year,
                TotalSessions = sessions.Count,
                AttendedSessions = attended,
                AbsentSessions = absent,
                ExcusedSessions = excused,
                PricePerSession = classEntity.PricePerSession.Value,
                TotalAmount = totalAmount,
                DiscountAmount = 0,
                FinalAmount = totalAmount,
                SessionDetails = sessionDetails
            };
        }

        public async Task<List<TuitionCalculationResult>> CalculateClassTuitionAsync(int classId, int month, int year)
        {
            // Get all students in class
            var students = await _context.Students
                .Include(s => s.Classes)
                .Include(s => s.StudentNavigation)
                .Where(s => s.Classes.Any(c => c.ClassId == classId))
                .ToListAsync();

            var results = new List<TuitionCalculationResult>();

            foreach (var student in students)
            {
                try
                {
                    var result = await CalculateTuitionAsync(student.UserId, classId, month, year);
                    results.Add(result);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error calculating tuition for student {StudentId}", student.UserId);
                }
            }

            return results;
        }

        public async Task<List<TuitionInvoice>> GetStudentPaymentHistoryAsync(int studentId)
        {
            return await _context.TuitionInvoices
                .Include(i => i.Class)
                .Where(i => i.StudentId == studentId)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<TuitionInvoice>> GetOutstandingInvoicesAsync(int studentId)
        {
            return await _context.TuitionInvoices
                .Include(i => i.Class)
                .Where(i => i.StudentId == studentId &&
                           (i.Status == "Sent" || i.Status == "Overdue"))
                .OrderBy(i => i.DueDate)
                .ToListAsync();
        }
    }
}
