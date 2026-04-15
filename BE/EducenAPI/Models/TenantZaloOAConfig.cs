using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EducenAPI.Models
{
    public class TenantZaloOAConfig
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string TenantId { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string AppId { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? OAId { get; set; }

        [Required]
        public string EncryptedSecretKey { get; set; } = string.Empty;

        public string? EncryptedAccessToken { get; set; }

        public string? EncryptedRefreshToken { get; set; }

        public DateTime? TokenExpiresAt { get; set; }

        public bool IsActive { get; set; } = false;

        public bool WebhookVerified { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [NotMapped]
        public string DisplayId => !string.IsNullOrEmpty(OAId) ? OAId : AppId;

        // Navigation
        [ForeignKey(nameof(TenantId))]
        public Tenant Tenant { get; set; } = null!;
    }
}
