namespace EducenAPI.Models
{
    public class PaymentConfigResolutionOptions
    {
        public const string SectionName = "PaymentConfigResolution";
        public bool EnableGlobalFallback { get; set; } = true;
    }
}
