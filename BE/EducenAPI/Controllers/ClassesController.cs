using EducenAPI.DTOs.Classes;
using EducenAPI.DTOs.Students;
using EducenAPI.Services;
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
    public class ClassesController : ControllerBase
    {
        private readonly IClassService _classService;

        public ClassesController(IClassService classService)
        {
            _classService = classService;
        }

        // GET: api/Classes
        [HttpGet]
        public async Task<IActionResult> GetClasses()
        {
            var classes = await _classService.GetAllClassesAsync();
            return Ok(classes);
        }

        // GET: api/Classes/5
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetClass(int id)
        {
            var classItem = await _classService.GetClassByIdAsync(id);

            if (classItem == null)
                return NotFound(new { message = "Class not found" });

            return Ok(classItem);
        }

        // POST: api/Classes
        [HttpPost]
        public async Task<IActionResult> CreateClass(CreateClassDto dto)
        {
            try
            {
                var classItem = await _classService.CreateClassAsync(dto);
                return CreatedAtAction(nameof(GetClass), new { id = classItem.ClassId }, classItem);
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT: api/Classes/5
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateClass(int id, UpdateClassDto dto)
        {
            try
            {
                var success = await _classService.UpdateClassAsync(id, dto);
                if (!success)
                    return NotFound(new { message = "Class not found" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // DELETE: api/Classes/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteClass(int id)
        {
            try
            {
                var success = await _classService.DeleteClassAsync(id);
                if (!success)
                    return NotFound(new { message = "Class not found" });

                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT: api/Classes/5/assign-teacher/{teacherId}
        [HttpPut("{id:int}/assign-teacher/{teacherId:int}")]
        public async Task<IActionResult> AssignTeacher(int id, int teacherId)
        {
            try
            {
                var success = await _classService.AssignTeacherAsync(id, teacherId);
                if (!success)
                    return NotFound(new { message = "Class not found" });

                return Ok(new { message = "Teacher assigned successfully" });
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // PUT: api/Classes/5/assign-assistant/{assistantId}
        [HttpPut("{id:int}/assign-assistant/{assistantId:int}")]
        public async Task<IActionResult> AssignAssistant(int id, int assistantId)
        {
            try
            {
                var success = await _classService.AssignAssistantAsync(id, assistantId);
                if (!success)
                    return NotFound(new { message = "Class not found" });

                return Ok(new { message = "Assistant assigned successfully" });
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // POST: api/Classes/5/students/{studentId}
        [HttpPost("{id:int}/students/{studentId:int}")]
        public async Task<IActionResult> AddStudentToClass(int id, int studentId)
        {
            try
            {
                var success = await _classService.AddStudentToClassAsync(id, studentId);
                if (!success)
                    return NotFound(new { message = "Class not found" });

                return Ok(new { message = "Student added to class successfully" });
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // DELETE: api/Classes/5/students/{studentId}
        [HttpDelete("{id:int}/students/{studentId:int}")]
        public async Task<IActionResult> RemoveStudentFromClass(int id, int studentId)
        {
            try
            {
                var success = await _classService.RemoveStudentFromClassAsync(id, studentId);
                if (!success)
                    return NotFound(new { message = "Class not found" });

                return Ok(new { message = "Student removed from class successfully" });
            }
            catch (Exception ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // POST: api/Classes/5/import-students
        [HttpPost("{id:int}/import-students")]
        public async Task<IActionResult> ImportStudentsToClass(int id, IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest(new { message = "No file uploaded" });

                var extension = System.IO.Path.GetExtension(file.FileName).ToLower();
                if (extension != ".xlsx" && extension != ".xls")
                    return BadRequest(new { message = "Only Excel files (.xlsx, .xls) are allowed" });

                // Validate class exists
                var classExists = await _classService.ClassExistsAsync(id);
                if (!classExists)
                    return NotFound(new { message = "Class not found" });

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

                        // Add existing student to class (validate student must exist first)
                        var result = await _classService.ImportStudentToClassAsync(id, new CreateStudentDto
                        {
                            Username = username,
                            FullName = fullName,
                            Email = email,
                            PhoneNumber = phoneNumber,
                            Password = string.Empty,
                            EnrollmentStatus = "Active"
                        });

                        if (result.Success)
                        {
                            importResults.Success++;
                        }
                        else
                        {
                            importResults.Failed++;
                            importResults.Errors.Add($"Row {row + 1}: {result.ErrorMessage}");
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
                    message = "Import to class completed",
                    classId = id,
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

        // GET: api/Classes/5/students
        [HttpGet("{id:int}/students")]
        public async Task<IActionResult> GetStudentsByClass(int id)
        {
            var students = await _classService.GetStudentsByClassIdAsync(id);
            return Ok(students);
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

