using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace EducenAPI.Filters
{
    public class QuotaCheckAttribute : ActionFilterAttribute
    {
        public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var quotaService = context.HttpContext.RequestServices.GetService<IQuotaService>();
            if (quotaService != null)
            {
                var actionName = context.ActionDescriptor.RouteValues.TryGetValue("action", out var a) ? a : "";
                var controllerName = context.Controller?.GetType().Name ?? "";

                bool needsQuotaCheck = false;

                // Teacher & Assistant: SendAccount
                if (actionName == "SendAccount" && 
                    (controllerName.Contains("Teacher") || controllerName.Contains("Assistant")))
                {
                    needsQuotaCheck = true;
                }

                // Students: SendAccount & CreateAccountForStudent
                if (controllerName.Contains("Student") && 
                    (actionName == "SendAccount" || actionName == "CreateAccountForStudent"))
                {
                    needsQuotaCheck = true;
                }

                // Parents: SendAccount
                if (controllerName.Contains("Parent") && actionName == "SendAccount")
                {
                    needsQuotaCheck = true;
                }

                if (needsQuotaCheck)
                {
                    var (canAdd, error) = await quotaService.CheckCanAddUserAsync();
                    if (!canAdd)
                    {
                        context.Result = new BadRequestObjectResult(new { message = error });
                        return;
                    }
                }
            }

            await next();
        }
    }
}