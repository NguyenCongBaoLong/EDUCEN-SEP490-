using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace EducenAPI.Attributes
{
    public class TrimAttribute : ValidationAttribute
    {
        protected override ValidationResult IsValid(object value, ValidationContext validationContext)
        {
            if (value is string stringValue)
            {
                var trimmedValue = stringValue.Trim();
                
                // Use reflection to set the trimmed value back to the property
                var property = validationContext.ObjectType.GetProperty(validationContext.MemberName);
                if (property != null && property.CanWrite)
                {
                    property.SetValue(validationContext.ObjectInstance, trimmedValue);
                }
            }
            
            return ValidationResult.Success;
        }
    }
}
