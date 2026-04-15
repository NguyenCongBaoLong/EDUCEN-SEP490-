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
                throw new Exception("Không tìm thấy lớp học.");

            if (!classEntity.PricePerSession.HasValue || classEntity.PricePerSession.Value <= 0)
                throw new Exception("Chưa thiết lập đơn giá mỗi buổi học cho lớp này. Vui lòng thiết lập đơn giá trong trang Quản lý học phí.");

            // Get student
            var student = await _context.Students
                .Include(s => s.StudentNavigation)
                .FirstOrDefaultAsync(s => s.UserId == studentId);

            if (student == null)
                throw new Exception("Không tìm thấy học sinh.");

            // Get all sessions in the month for this class
            var startOfMonth = new DateTime(year, month, 1);
            var startOfNextMonth = startOfMonth.AddMonths(1);

            var sessions = await _context.ClassSessions
                .Include(s => s.Attendances)
                .Where(s => s.Schedule.ClassId == classId &&
                            s.SessionDate >= startOfMonth &&
                            s.SessionDate < startOfNextMonth)
                .OrderBy(s => s.SessionDate)
                .ToListAsync();

            // Calculate attendance
            var sessionDetails = new List<SessionAttendanceDetail>();
            int attended = 0, absent = 0;

            foreach (var session in sessions)
            {
                var attendance = session.Attendances?.FirstOrDefault(a => a.StudentId == studentId);
                var status = attendance?.Status ?? "Absent";

                if (status == "present" || status == "Attended") attended++;
                else absent++;

                var pricePerSession = classEntity.PricePerSession.Value;
                var amount = (status == "present" || status == "Attended") ? pricePerSession : 0;

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
                PricePerSession = classEntity.PricePerSession.Value,
                TotalAmount = totalAmount,
                DiscountAmount = 0,
                FinalAmount = totalAmount,
                SessionDetails = sessionDetails
            };
        }

        public async Task<List<TuitionCalculationResult>> CalculateClassTuitionAsync(int classId, int month, int year)
        {
            // Verify class exists
            var classExists = await _context.Classes.AnyAsync(c => c.ClassId == classId);
            if (!classExists)
                throw new Exception("Không tìm thấy lớp học");

            // Verify class has PricePerSession set
            var classPrice = await _context.Classes
                .Where(c => c.ClassId == classId)
                .Select(c => c.PricePerSession)
                .FirstOrDefaultAsync();
            if (!classPrice.HasValue || classPrice.Value <= 0)
                throw new Exception("Lớp học chưa có đơn giá mỗi buổi. Vui lòng cập nhật đơn giá trong trang Quản lý học phí trước khi tính học phí.");

            // Get all students in class
            var students = await _context.Students
                .Include(s => s.Classes)
                .Include(s => s.StudentNavigation)
                .Where(s => s.Classes.Any(c => c.ClassId == classId))
                .ToListAsync();

            if (!students.Any())
                throw new Exception("Lớp học chưa có học sinh nào. Vui lòng thêm học sinh vào lớp trước khi tính học phí.");

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
                .Where(i => i.StudentId == studentId && i.Status != "Draft" && i.Status != "Cancelled")
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
