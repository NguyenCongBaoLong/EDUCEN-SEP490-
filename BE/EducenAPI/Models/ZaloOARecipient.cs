using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Models
{
    public class ZaloOARecipient
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string ZaloUserId { get; set; } = string.Empty;

        public bool IsFollowing { get; set; } = true;

        public DateTime? FollowedAt { get; set; }

        public DateTime? UnfollowedAt { get; set; }
    }
}
