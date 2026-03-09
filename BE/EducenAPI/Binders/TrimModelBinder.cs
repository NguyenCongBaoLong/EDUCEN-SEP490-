using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Binders;
using System.Text.RegularExpressions;

namespace EducenAPI.Binders
{
    public class TrimModelBinder : IModelBinder
    {
        public Task BindModelAsync(ModelBindingContext bindingContext)
        {
            if (bindingContext == null)
                throw new ArgumentNullException(nameof(bindingContext));

            var value = bindingContext.ValueProvider.GetValue(bindingContext.ModelName).FirstValue;
            
            if (value != null)
            {
                // Trim leading and trailing whitespace
                var trimmedValue = value.Trim();
                bindingContext.Result = ModelBindingResult.Success(trimmedValue);
            }
            else
            {
                bindingContext.Result = ModelBindingResult.Success(null);
            }

            return Task.CompletedTask;
        }
    }

    public class TrimModelBinderProvider : IModelBinderProvider
    {
        public IModelBinder GetBinder(ModelBinderProviderContext context)
        {
            if (context == null)
                throw new ArgumentNullException(nameof(context));

            if (context.Metadata.ModelType == typeof(string))
            {
                return new TrimModelBinder();
            }

            return null;
        }
    }
}
