using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs
{
    public class CreateTenantRequest
    {
        //[Required]
        //[MaxLength(100)]
        public string? TenantId { get; set; }

        //[Required]
        //[MaxLength(200)]
        public string? TenantName { get; set; }

        //[MaxLength(200)]
        public string? ContactPerson { get; set; }

        //[MaxLength(150)]
        //[EmailAddress]
        public string? Email { get; set; }

        //[MaxLength(20)]
        public string? PhoneNumber { get; set; }

        //[MaxLength(300)]
        public string? Address { get; set; }

        //[Required]
        //[MaxLength(200)]
        public string? DomainUrl { get; set; }      

        public bool IsActive { get; set; } = true;
    }
}
