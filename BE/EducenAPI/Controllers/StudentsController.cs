using EducenAPI.DTOs.Students;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.Data;
using System.Text;
using ExcelDataReader;
using EducenAPI.Persistence.Contexts;
using Microsoft.EntityFrameworkCore;

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

        public StudentsController(IStudentService studentService, EducenV2Context context, MailService mailService, IClassService classService)
        {
            _studentService = studentService;
            _context = context;
            _mailService = mailService;
            _classService = classService;
        }

        // GET: api/Students
        [HttpGet]
        public async Task<IActionResult> GetStudents()
        {
            var students = await _studentService.GetAllStudentsAsync();
            return Ok(students);
        }

        // GET: api/Students/5
        [HttpGet("{id:int}")]
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

        // POST: api/Students/import
        [HttpPost("import")]
        public async Task<IActionResult> ImportStudents(IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest(new { message = "No file uploaded" });

                var extension = System.IO.Path.GetExtension(file.FileName).ToLower();
                if (extension != ".xlsx" && extension != ".xls")
                    return BadRequest(new { message = "Only Excel files (.xlsx, .xls) are allowed" });

                var importResults = new ImportResults();

                System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);

                using var stream = file.OpenReadStream();
                using var reader = ExcelReaderFactory.CreateReader(stream);
                
                var dataSet = reader.AsDataSet();
                var worksheet = dataSet.Tables[0];
                
                if (worksheet == null)
                    return BadRequest(new { message = "No worksheet found in Excel file" });

                // Validate template headers
                var headerRow = worksheet.Rows[0];
                var actualHeaders = new List<string>();
                for (int col = 0; col < headerRow.ItemArray.Length; col++)
                {
                    actualHeaders.Add(headerRow.ItemArray[col]?.ToString()?.Trim() ?? "");
                }

                var validationResult = ImportTemplate.ValidateHeaders(actualHeaders);
                if (!validationResult.IsValid)
                {
                    return BadRequest(new { 
                        message = $"Invalid template format: {validationResult.ErrorMessage}",
                        templateInfo = new {
                            templateName = ImportTemplate.TEMPLATE_NAME,
                            requiredHeaders = ImportTemplate.REQUIRED_HEADERS,
                            example = "Please use the correct template with headers: Username, Full Name, Email, Phone Number, Grade, DateOfBirth, Gender"
                        }
                    });
                }

                // Create column index mapping
                var columnMapping = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                for (int col = 0; col < actualHeaders.Count; col++)
                {
                    var normalizedHeader = actualHeaders[col].ToLower().Trim();
                    if (ImportTemplate.HEADER_MAPPING.TryGetValue(normalizedHeader, out var mappedHeader))
                    {
                        columnMapping[mappedHeader] = col;
                    }
                }

                // Track duplicates within file
                var fileEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var fileUsernames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                // Process Excel data using column mapping
                for (int row = 1; row < worksheet.Rows.Count; row++)
                {
                    importResults.Total++;
                    
                    try
                    {
                        var rowData = worksheet.Rows[row];
                        
                        // Extract data using column mapping
                        var username = columnMapping.ContainsKey("Username") 
                            ? rowData.ItemArray[columnMapping["Username"]]?.ToString()?.Trim() ?? ""
                            : "";
                            
                        var fullName = columnMapping.ContainsKey("FullName") 
                            ? rowData.ItemArray[columnMapping["FullName"]]?.ToString()?.Trim() ?? ""
                            : "";
                            
                        var email = columnMapping.ContainsKey("Email") 
                            ? rowData.ItemArray[columnMapping["Email"]]?.ToString()?.Trim() ?? ""
                            : "";
                            
                        var phoneNumber = columnMapping.ContainsKey("PhoneNumber") 
                            ? rowData.ItemArray[columnMapping["PhoneNumber"]]?.ToString()?.Trim()
                            : null;

                        var grade = columnMapping.ContainsKey("Grade") 
                            ? rowData.ItemArray[columnMapping["Grade"]]?.ToString()?.Trim()
                            : null;

                        var dateOfBirth = columnMapping.ContainsKey("DateOfBirth") 
                            ? rowData.ItemArray[columnMapping["DateOfBirth"]]?.ToString()?.Trim()
                            : null;

                        var gender = columnMapping.ContainsKey("Gender") 
                            ? rowData.ItemArray[columnMapping["Gender"]]?.ToString()?.Trim()
                            : null;

                        // Parse DateOfBirth if provided
                        DateTime? parsedDateOfBirth = null;
                        if (!string.IsNullOrWhiteSpace(dateOfBirth))
                        {
                            if (DateTime.TryParse(dateOfBirth, out DateTime dob))
                            {
                                parsedDateOfBirth = dob;
                            }
                            else
                            {
                                importResults.Failed++;
                                importResults.Errors.Add($"Row {row + 1}: Invalid date format for DateOfBirth '{dateOfBirth}'. Use format: MM/DD/YYYY or DD/MM/YYYY");
                                continue;
                            }
                        }

                        // Validate required fields
                        if (string.IsNullOrWhiteSpace(username) || 
                            string.IsNullOrWhiteSpace(fullName) || 
                            string.IsNullOrWhiteSpace(email))
                        {
                            importResults.Failed++;
                            importResults.Errors.Add($"Row {row + 1}: Missing required data (Username, Full Name, Email)");
                            continue;
                        }

                        // Validate phone/email mutual exclusion
                        if (!string.IsNullOrWhiteSpace(phoneNumber) && !string.IsNullOrWhiteSpace(email))
                        {
                            importResults.Failed++;
                            importResults.Errors.Add($"Row {row + 1}: Cannot have both Phone Number and Email. Please provide either Phone Number OR Email, not both.");
                            continue;
                        }

                        if (string.IsNullOrWhiteSpace(phoneNumber) && string.IsNullOrWhiteSpace(email))
                        {
                            importResults.Failed++;
                            importResults.Errors.Add($"Row {row + 1}: Either Phone Number or Email is required.");
                            continue;
                        }

                        // Check duplicates within file
                        if (!string.IsNullOrWhiteSpace(email) && fileEmails.Contains(email))
                        {
                            importResults.Failed++;
                            importResults.Errors.Add($"Row {row + 1}: Email '{email}' already exists in import file");
                            continue;
                        }

                        if (!string.IsNullOrWhiteSpace(username) && fileUsernames.Contains(username))
                        {
                            importResults.Failed++;
                            importResults.Errors.Add($"Row {row + 1}: Username '{username}' already exists in import file");
                            continue;
                        }

                        // Add to file tracking
                        if (!string.IsNullOrWhiteSpace(email))
                            fileEmails.Add(email);
                        if (!string.IsNullOrWhiteSpace(username))
                            fileUsernames.Add(username);

                        // Validate unique username and email
                        var existingUser = await _context.Users
                            .FirstOrDefaultAsync(u => u.Username == username);
                        if (existingUser != null)
                        {
                            importResults.Failed++;
                            importResults.Errors.Add($"Row {row + 1}: Username '{username}' already exists");
                            continue;
                        }

                        var existingStudent = await _context.Students
                            .FirstOrDefaultAsync(s => s.Email == email);
                        if (existingStudent != null)
                        {
                            importResults.Failed++;
                            importResults.Errors.Add($"Row {row + 1}: Email '{email}' already exists");
                            continue;
                        }

                        // Check if student already exists (for existing students, don't create new account)
                        bool isExistingStudent = existingStudent != null;

                        var createStudentDto = new CreateStudentDto
                        {
                            Username = isExistingStudent ? "" : username, // Only set username if new student
                            FullName = fullName,
                            Email = email,
                            PhoneNumber = phoneNumber,
                            Password = isExistingStudent ? "" : PasswordGenerator.GenerateSecurePassword(), // Only generate password for new students
                            EnrollmentStatus = "Active",
                            Grade = grade,
                            DateOfBirth = parsedDateOfBirth,
                            Gender = gender
                        };

                        if (isExistingStudent)
                        {
                            // Import existing student to class (default classId = 1)
                            var defaultClassId = 1;
                            var classExists = await _context.Classes.FindAsync(defaultClassId);
                            if (classExists == null)
                            {
                                importResults.Failed++;
                                importResults.Errors.Add($"Row {row + 1}: Class not found");
                                continue;
                            }

                            var importResult = await _classService.ImportStudentToClassAsync(defaultClassId, createStudentDto);
                            if (importResult.Success)
                            {
                                importResults.Success++;
                            }
                            else
                            {
                                importResults.Failed++;
                                importResults.Errors.Add($"Row {row + 1}: {importResult.ErrorMessage}");
                            }
                        }
                        else
                        {
                            // Create new student account
                            await _studentService.CreateStudentAsync(createStudentDto);
                            importResults.Success++;
                        }
                    }
                    catch (Exception ex)
                    {
                        importResults.Failed++;
                        importResults.Errors.Add($"Row {row + 1}: Error - {ex.Message}");
                    }
                }

                return Ok(new
                {
                    message = "Import completed",
                    importResults,
                    defaultPasswordNote = "Secure passwords have been generated for all imported students",
                    templateInfo = new {
                        templateName = ImportTemplate.TEMPLATE_NAME,
                        mappedHeaders = columnMapping.Keys.ToList()
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Import failed: {ex.Message}" });
            }
        }
        [HttpPost("send-account/{studentId}")]
        public async Task<IActionResult> SendAccount(int studentId)
        {
            var user = await _context.Users
        .Include(x => x.Student)
        .FirstOrDefaultAsync(x => x.UserId == studentId);

            if (user == null)
                return NotFound("User không tồn tại");

            if (user.Student == null || string.IsNullOrEmpty(user.Student.Email))
                return BadRequest("Student chưa có email");

            // tạo password mới
            string newPassword = PasswordGenerator.GenerateSecurePassword();

            // hash password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            user.IsAccountSent = true;
            user.AccountStatus = "Active"; // Kích hoạt tài khoản khi gửi mail
            await _context.SaveChangesAsync();

            // gửi mail
            await _mailService.SendStudentAccount(user.Student.Email, user.Username, newPassword);

            return Ok("Đã gửi tài khoản thành công");
        }
        private sealed class ImportResults
        {
            public int Total { get; set; }
            public int Success { get; set; }
            public int Failed { get; set; }
            public List<string> Errors { get; set; } = new();
        }
    }
}
