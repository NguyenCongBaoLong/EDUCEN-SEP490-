using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    public class SupportRequest
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int SenderId { get; set; }

        public int? ReceiverId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; }

        [Required]
        public string Content { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "Pending";

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public string? AdminResponse { get; set; }

        // Navigation
        [ForeignKey("SenderId")]
        public User Sender { get; set; }

        // Navigation
        [ForeignKey("ReceiverId")]
        public User Receiver { get; set; }


    }
}
