using Microsoft.AspNetCore.Mvc;

namespace EduCen.Controllers
{
    public class TestController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
