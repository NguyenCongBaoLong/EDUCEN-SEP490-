using EducenAPI.DTOs.Students;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.Data;
using System.Text;
using ExcelDataReader;

namespace EducenAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StudentsController : ControllerBase
    {
        private readonly IStudentService _studentService;

        public StudentsController(IStudentService studentService)
        {
            _studentService = studentService;
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
        public async Task<IActionResult> CreateStudent(CreateStudentDto dto)
        {
            try
            {
                var student = await _studentService.CreateStudentAsync(dto);
                return CreatedAtAction(nameof(GetStudent), new { id = student.UserId }, student);
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
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
                            example = "Please use the correct template with headers: Username, Full Name, Email, Phone Number"
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

                        // Validate required fields
                        if (string.IsNullOrWhiteSpace(username) || 
                            string.IsNullOrWhiteSpace(fullName) || 
                            string.IsNullOrWhiteSpace(email))
                        {
                            importResults.Failed++;
                            importResults.Errors.Add($"Row {row + 1}: Missing required data (Username, Full Name, Email)");
                            continue;
                        }

                        var createStudentDto = new CreateStudentDto
                        {
                            Username = username,
                            FullName = fullName,
                            Email = email,
                            PhoneNumber = phoneNumber,
                            Password = username + "123", // Default password: username + "123"
                            EnrollmentStatus = "Active"
                        };

                        await _studentService.CreateStudentAsync(createStudentDto);
                        importResults.Success++;
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
                    defaultPasswordNote = "Default passwords are: username + '123'",
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

        private sealed class ImportResults
        {
            public int Total { get; set; }
            public int Success { get; set; }
            public int Failed { get; set; }
            public List<string> Errors { get; set; } = new();
        }
    }
}
