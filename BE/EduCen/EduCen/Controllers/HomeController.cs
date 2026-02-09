using Microsoft.AspNetCore.Mvc;

namespace EduCen.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
