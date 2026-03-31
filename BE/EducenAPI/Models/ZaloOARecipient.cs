using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    public class ZaloOARecipient
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [MaxLength(200)]
        public string ZaloUserId { get; set; } = string.Empty;

        public bool IsFollowing { get; set; } = true;

        public DateTime? FollowedAt { get; set; }

        public DateTime? UnfollowedAt { get; set; }

        // Navigation
        [ForeignKey(nameof(UserId))]
        public User User { get; set; } = null!;
    }
}
