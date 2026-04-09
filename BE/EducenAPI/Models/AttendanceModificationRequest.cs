using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    /// <summary>
    /// Yêu cầu sửa điểm danh từ Teacher (khi quá hạn 2 ngày)
    /// </summary>
    public class AttendanceModificationRequest
    {
        [Key]
        public int RequestId { get; set; }

        public int SessionId { get; set; }

        public int StudentId { get; set; }

        /// <summary>
        /// Trạng thái yêu cầu: Pending, Approved, Rejected
        /// </summary>
        [MaxLength(20)]
        public string Status { get; set; } = "Pending";

        /// <summary>
        /// Trạng thái điểm danh hiện tại (cũ)
        /// </summary>
        [MaxLength(20)]
        public string? CurrentStatus { get; set; }

        /// <summary>
        /// Trạng thái muốn sửa thành
        /// </summary>
        [MaxLength(20)]
        public string RequestedStatus { get; set; }

        /// <summary>
        /// Lý do yêu cầu sửa
        /// </summary>
        [MaxLength(500)]
        public string? Reason { get; set; }

        /// <summary>
        /// Người tạo yêu cầu (Teacher/Assistant)
        /// </summary>
        public int RequestedByUserId { get; set; }

        /// <summary>
        /// Người duyệt (Admin)
        /// </summary>
        public int? ReviewedByUserId { get; set; }

        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ReviewedAt { get; set; }

        /// <summary>
        /// Ghi chú của Admin khi duyệt/từ chối
        /// </summary>
        [MaxLength(500)]
        public string? ReviewNote { get; set; }

        // Navigation
        public virtual ClassSession Session { get; set; } = null!;

        public virtual Student Student { get; set; } = null!;

        [ForeignKey(nameof(RequestedByUserId))]
        public virtual User RequestedByUser { get; set; } = null!;

        [ForeignKey(nameof(ReviewedByUserId))]
        public virtual User? ReviewedByUser { get; set; }
    }
}