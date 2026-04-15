using System;
using System.Collections.Generic;

namespace EducenAPI.Models;

    public partial class Class
    {
        public int ClassId { get; set; }

        public int? TeacherId { get; set; }

        public int? AssistantId { get; set; }

        public int SubjectId { get; set; }
        public int? GradeId { get; set; }
        public int? RoomId { get; set; }
        public string? ClassName { get; set; }

        public string? SyllabusContent { get; set; }

        public string? Description { get; set; }

        public string? Status { get; set; }
        public int MaxStudents { get; set; } // Mandatory
        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        // === Thông tin học phí ===
        public decimal? PricePerSession { get; set; } // Giá mỗi buổi học (null = miễn phí hoặc chưa thiết lập)

    public virtual Assistant? Assistant { get; set; }

    public virtual ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();

    public virtual Subject Subject { get; set; } = null!;

    public virtual Teacher Teacher { get; set; } = null!;

    public virtual ICollection<Student> Students { get; set; } = new List<Student>();
    public ICollection<ClassSession> Sessions { get; set; }
    public virtual Grade? Grade { get; set; }
    public virtual Room? Room { get; set; }

}
