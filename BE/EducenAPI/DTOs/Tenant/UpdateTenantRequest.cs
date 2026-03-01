namespace EducenAPI.DTOs.Tenant
{
    public class UpdateTenantRequest
    {
        public string TenantName { get; set; } = null!;
        public string? ContactPerson { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public string DomainUrl { get; set; } = null!;
        public bool IsActive { get; set; }
    }
}
