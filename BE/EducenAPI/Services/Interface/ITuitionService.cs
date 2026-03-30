using EducenAPI.Models;

namespace EducenAPI.Services.Interface
{
    public interface ITuitionService
    {
        /// <summary>
        /// Tính toán học phí cho một học sinh trong một lớp học cho tháng cụ thể
        /// </summary>
        Task<TuitionCalculationResult> CalculateTuitionAsync(int studentId, int classId, int month, int year);

        /// <summary>
        /// Tính toán học phí cho nhiều học sinh trong một lớp
        /// </summary>
        Task<List<TuitionCalculationResult>> CalculateClassTuitionAsync(int classId, int month, int year);

        /// <summary>
        /// Lấy lịch sử đóng học phí của một học sinh
        /// </summary>
        Task<List<TuitionInvoice>> GetStudentPaymentHistoryAsync(int studentId);

        /// <summary>
        /// Lấy danh sách hóa đơn chưa thanh toán của học sinh
        /// </summary>
        Task<List<TuitionInvoice>> GetOutstandingInvoicesAsync(int studentId);
    }

    public class TuitionCalculationResult
    {
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public int ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        public int TotalSessions { get; set; }
        public int AttendedSessions { get; set; }
        public int AbsentSessions { get; set; }
        public int ExcusedSessions { get; set; }
        public decimal PricePerSession { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public List<SessionAttendanceDetail> SessionDetails { get; set; } = new();
    }

    public class SessionAttendanceDetail
    {
        public int SessionId { get; set; }
        public DateTime SessionDate { get; set; }
        public string Status { get; set; } = string.Empty; // Attended | Absent | Excused
        public decimal Amount { get; set; }
    }
}
