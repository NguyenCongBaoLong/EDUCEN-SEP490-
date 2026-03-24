using EducenAPI.DTOs.Students;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.Data;
using System.Text;
using EducenAPI.Persistence.Contexts;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using EducenAPI.Models;

namespace EducenAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StudentsController : ControllerBase
    {
        private readonly IStudentService _studentService;
        private readonly EducenV2Context _context;
        private readonly MailService _mailService;
        private readonly IClassService _classService;
        private readonly IStudentImportService _studentImportService;

        public StudentsController(
            IStudentService studentService, 
            EducenV2Context context, 
            MailService mailService, 
            IClassService classService,
            IStudentImportService studentImportService)
        {
            _studentService = studentService;
            _context = context;
            _mailService = mailService;
            _classService = classService;
            _studentImportService = studentImportService;
        }

        // GET: api/Students
        [HttpGet]
        [Authorize(Roles = "Admin,Teacher,Assistant")]
        public async Task<IActionResult> GetStudents()
        {
            var students = await _studentService.GetAllStudentsAsync();
            return Ok(students);
        }

        // GET: api/Students/5
        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin,Teacher,Assistant")]
        public async Task<IActionResult> GetStudent(int id)
        {
            var student = await _studentService.GetStudentByIdAsync(id);

            if (student == null)
                return NotFound(new { message = "Student not found" });

            return Ok(student);
        }

        // POST: api/Students
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateStudent(CreateStudentDto dto)
        {
            try
            {
                var student = await _studentService.CreateStudentAsync(dto);
                return CreatedAtAction(nameof(GetStudent), new { id = student.UserId }, student);
            }
            catch (Exception ex)
            {
                // Return 409 for conflicts (duplicate username/email)
                if (ex.Message.Contains("already exists"))
                    return Conflict(new { message = ex.Message });
                
                // Return 400 for other errors
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/Students/5
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> UpdateStudent(int id, UpdateStudentDto dto)
        {
            try
            {
                var success = await _studentService.UpdateStudentAsync(id, dto);
                if (!success)
                    return NotFound(new { message = "Student not found" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // DELETE: api/Students/5
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> DeleteStudent(int id)
        {
            try
            {
                var success = await _studentService.DeleteStudentAsync(id);
                if (!success)
                    return NotFound(new { message = "Student not found" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Students/import?classId=1
        [HttpPost("import")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> ImportStudents(IFormFile file, [FromQuery] int? classId)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest(new { message = "No file uploaded" });

                var extension = System.IO.Path.GetExtension(file.FileName).ToLower();
                if (extension != ".xlsx" && extension != ".xls")
                    return BadRequest(new { message = "Only Excel files (.xlsx, .xls) are allowed" });

                // Validate classId if provided
                if (classId.HasValue)
                {
                    var classExists = await _context.Classes.FindAsync(classId.Value);
                    if (classExists == null)
                        return BadRequest(new { message = $"Class with ID {classId} not found" });
                }

                // Use StudentImportService to handle import logic (pass classId)
                var result = await _studentImportService.ImportStudentsAsync(file, classId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Import failed: {ex.Message}" });
            }
        }
        [HttpPost("send-account/{studentId}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> SendAccount(int studentId)
        {
            var user = await _context.Users
        .Include(x => x.Student)
        .FirstOrDefaultAsync(x => x.UserId == studentId);

            if (user == null)
                return NotFound("User không tồn tại");

            if (string.IsNullOrEmpty(user.Email))
                return BadRequest("User chưa có email");

            // Nếu chưa có username thì tạo mới (ví dụ: stu_ + id)
            if (string.IsNullOrEmpty(user.Username))
            {
                user.Username = $"stu_{user.UserId}";
            }

            // tạo password mới
            string newPassword = PasswordGenerator.GenerateSecurePassword();

            // hash password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            user.IsAccountSent = true;
            user.AccountStatus = "Active"; // Kích hoạt tài khoản khi gửi mail
            await _context.SaveChangesAsync();

            // gửi mail
            await _mailService.SendStudentAccount(user.Email, user.Username!, newPassword);

            return Ok("Đã gửi tài khoản thành công");
        }

        [HttpPost("create-account/{studentId}")]
        [Authorize(Roles = "Admin,TenantAdmin")]
        public async Task<IActionResult> CreateAccountForStudent(int studentId, [FromBody] CreateAccountRequest request)
        {
            try
            {
                var student = await _context.Students.FindAsync(studentId);
                if (student == null)
                    return NotFound("Student not found");

                // Since UserId is now non-nullable and always created with User, check if User exists
                var userExists = await _context.Users.AnyAsync(u => u.UserId == student.UserId);
                if (userExists)
                    return BadRequest("Student already has an account");

                // Validate request
                if (string.IsNullOrWhiteSpace(request.Username))
                    return BadRequest("Username is required");

                if (string.IsNullOrWhiteSpace(request.Password))
                    return BadRequest("Password is required");

                // Check duplicate username
                var existingUsername = await _context.Users
                    .AnyAsync(u => u.Username == request.Username);
                if (existingUsername)
                    return Conflict("Username already exists");

                // Create user account
                var studentRole = await _context.Roles
                    .FirstOrDefaultAsync(r => r.RoleName == "Student");
                if (studentRole == null)
                    return BadRequest("Student role not found");

                // Lấy email từ User nếu đã có, hoặc từ Student nếu chưa có User
                var userEmail = student.StudentNavigation?.Email ?? student.Email;
                
                var user = new User
                {
                    Username = request.Username,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                    RoleId = studentRole.RoleId,
                    FullName = request.FullName ?? "",
                    Email = userEmail,
                    PhoneNumber = request.PhoneNumber,
                    AccountStatus = "Active",
                    IsAccountSent = true
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                // Link student to user
                student.UserId = user.UserId;
                await _context.SaveChangesAsync();

                // Send account email
                await _mailService.SendStudentAccount(userEmail ?? "", request.Username, request.Password);

                return Ok(new { message = "Account created and sent successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        private sealed class ImportResults
        {
            public int Total { get; set; }
            public int Success { get; set; }
            public int Failed { get; set; }
            public List<string> Errors { get; set; } = new();
        }

        public class CreateAccountRequest
        {
            [Required]
            public string Username { get; set; } = string.Empty;
            
            [Required]
            public string Password { get; set; } = string.Empty;
            
            public string? FullName { get; set; }
            public string? PhoneNumber { get; set; }
        }
    }
}
