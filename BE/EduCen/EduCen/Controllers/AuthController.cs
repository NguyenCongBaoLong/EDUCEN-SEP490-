using EduCen.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.Security.Cryptography;
using System.Text;

namespace EduCen.Controllers
{
    public class AuthController : Controller
    {
        private readonly EduCenV2Context _context;

        public AuthController(EduCenV2Context context)
        {
            _context = context;
        }

        // ===================== LOGIN =====================
        [HttpGet]
        public IActionResult Login()
        {
            return View();
        }

        [HttpPost]
        public IActionResult Login(string username, string password)
        {
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                ViewBag.Error = "Username and password are required";
                return View();
            }

            var user = _context.Users
                .FirstOrDefault(u => u.Username == username);

            if (user == null)
            {
                ViewBag.Error = "Invalid username";
                return View();
            }

            if (user.AccountStatus != "ACTIVE")
            {
                ViewBag.Error = "Account is disabled";
                return View();
            }

            if (user.PasswordHash != Hash(password))
            {
                ViewBag.Error = "Invalid password";
                return View();
            }

            HttpContext.Session.SetInt32("UserId", user.UserId);
            HttpContext.Session.SetString("Username", user.Username);
            HttpContext.Session.SetInt32("RoleId", user.RoleId);

            return RedirectToAction("Index", "Home");

        }

        // ===================== REGISTER =====================
        [HttpGet]
        public IActionResult Register()
        {
            return View();
        }

        [HttpPost]
        public IActionResult Register(string username, string password, string fullName)
        {
            if (_context.Users.Any(u => u.Username == username))
            {
                ViewBag.Error = "Username already exists";
                return View();
            }

            var user = new User
            {
                Username = username,
                PasswordHash = Hash(password),
                FullName = fullName,
                RoleId = 3,              // ⭐ DEFAULT ROLE (Student)
                AccountStatus = "ACTIVE"
            };

            _context.Users.Add(user);
            _context.SaveChanges();

            return RedirectToAction("Login");
        }


        // ===================== PROFILE =====================
        public IActionResult Profile()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null) return RedirectToAction("Login");

            var user = _context.Users.FirstOrDefault(u => u.UserId == userId);
            if (user == null) return RedirectToAction("Login");

            return View(user);
        }

        // ===================== EDIT PROFILE =====================
        [HttpGet]
        public IActionResult EditProfile()
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null) return RedirectToAction("Login");

            var user = _context.Users.FirstOrDefault(u => u.UserId == userId);
            if (user == null) return RedirectToAction("Login");

            return View(user);
        }

        [HttpPost]
        public IActionResult EditProfile(string fullName)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            if (userId == null) return RedirectToAction("Login");

            var user = _context.Users.FirstOrDefault(u => u.UserId == userId);
            if (user == null) return RedirectToAction("Login");

            user.FullName = fullName;
            _context.SaveChanges();

            return RedirectToAction("Profile");
        }

        // ===================== LOGOUT =====================
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Login");
        }

        // ===================== HASH =====================
        private string Hash(string password)
        {
            using var sha = SHA256.Create();
            return Convert.ToBase64String(
                sha.ComputeHash(Encoding.UTF8.GetBytes(password))
            );
        }
    }
}
