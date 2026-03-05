using System.ComponentModel.DataAnnotations;

namespace EducenAPI.DTOs.Plans
{
    public class CreatePlanRequest
    {
        [Required]
        [MaxLength(100)]
        public string PlanName { get; set; }

        [Range(0, double.MaxValue)]
        public decimal Price { get; set; }

        [Range(1, int.MaxValue)]
        public int LimitUsers { get; set; }

        public string? Features { get; set; }

        [Range(1, int.MaxValue)]
        public int StorageLimit { get; set; }
    }
}
