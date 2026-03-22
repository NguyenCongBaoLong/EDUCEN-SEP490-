using System.Data;
using EducenAPI.DTOs.Students;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
using ExcelDataReader;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using EducenAPI.Models;

namespace EducenAPI.Services;

public class StudentImportService : IStudentImportService
{
    private readonly EducenV2Context _context;
    private readonly IStudentService _studentService;
    private readonly IClassService _classService;

    public StudentImportService(
        EducenV2Context context,
        IStudentService studentService,
        IClassService classService)
    {
        _context = context;
        _studentService = studentService;
        _classService = classService;
    }

    private sealed class ImportResults
    {
        public int Total { get; set; }
        public int Success { get; set; }
        public int Failed { get; set; }
        public int Skipped { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    public async Task<object> ImportStudentsAsync(IFormFile file, int? classId = null)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("No file uploaded");

        var extension = Path.GetExtension(file.FileName).ToLower();
        if (extension != ".xlsx" && extension != ".xls")
            throw new ArgumentException("Only Excel files (.xlsx, .xls) are allowed");

        var importResults = new ImportResults();

        System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);

        using var stream = file.OpenReadStream();
        using var reader = ExcelReaderFactory.CreateReader(stream);

        var dataSet = reader.AsDataSet();

        if (dataSet.Tables == null || dataSet.Tables.Count == 0)
            throw new ArgumentException("Excel file contains no data");

        var worksheet = dataSet.Tables[0];
        if (worksheet == null)
            throw new ArgumentException("No worksheet found in Excel file");

        if (worksheet.Rows == null || worksheet.Rows.Count == 0)
            throw new ArgumentException("Worksheet contains no data");

        if (worksheet.Rows.Count < 1)
            throw new ArgumentException("Worksheet must have at least header row");

        var headerRow = worksheet.Rows[0];
        if (headerRow == null || headerRow.ItemArray == null || headerRow.ItemArray.Length == 0)
            throw new ArgumentException("Header row is empty or invalid");

        var actualHeaders = new List<string>();
        for (int col = 0; col < headerRow.ItemArray.Length; col++)
        {
            actualHeaders.Add(headerRow.ItemArray[col]?.ToString()?.Trim() ?? "");
        }

        var validationResult = ImportTemplate.ValidateHeaders(actualHeaders);
        if (!validationResult.IsValid)
        {
            throw new ArgumentException(
                $"Invalid template format: {validationResult.ErrorMessage}");
        }

        var columnMapping = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        for (int col = 0; col < actualHeaders.Count; col++)
        {
            var normalizedHeader = actualHeaders[col].ToLower().Trim();
            if (ImportTemplate.HEADER_MAPPING.TryGetValue(normalizedHeader, out var mappedHeader))
            {
                columnMapping[mappedHeader] = col;
            }
        }

        var fileEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var fileUsernames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (worksheet.Rows.Count <= 1)
            throw new ArgumentException("Excel file contains only headers, no data rows found");

        // Use transaction for batch import
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            for (int row = 1; row < worksheet.Rows.Count; row++)
            {
                importResults.Total++;

                try
                {
                    var rowData = worksheet.Rows[row];
                    if (rowData == null || rowData.ItemArray == null)
                    {
                        importResults.Failed++;
                        importResults.Errors.Add($"Row {row + 1}: Empty or invalid row data");
                        continue;
                    }

                    string GetValue(string key)
                    {
                        if (!columnMapping.ContainsKey(key)) return string.Empty;
                        var index = columnMapping[key];
                        if (index >= rowData.ItemArray.Length) return string.Empty;
                        return rowData.ItemArray[index]?.ToString()?.Trim() ?? string.Empty;
                    }

                    var username = GetValue("Username");
                    var fullName = GetValue("FullName");
                    var email = GetValue("Email");
                    var phoneNumber = GetValue("PhoneNumber");
                    var grade = GetValue("Grade");
                    var dateOfBirthRaw = GetValue("DateOfBirth");
                    var gender = GetValue("Gender");

                    DateTime? parsedDateOfBirth = null;
                    if (!string.IsNullOrWhiteSpace(dateOfBirthRaw))
                    {
                        if (DateTime.TryParse(dateOfBirthRaw, out DateTime dob))
                        {
                            parsedDateOfBirth = dob;
                        }
                        else
                        {
                            importResults.Failed++;
                            importResults.Errors.Add($"Row {row + 1}: Invalid date format for DateOfBirth '{dateOfBirthRaw}'. Use format: MM/DD/YYYY or DD/MM/YYYY");
                            continue;
                        }
                    }

                    // Validation: FullName và Email là bắt buộc
                    if (string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(email))
                    {
                        importResults.Failed++;
                        importResults.Errors.Add($"Row {row + 1}: Missing required data (Full Name, Email)");
                        continue;
                    }

                    // Chỉ validate duplicate username nếu username có giá trị
                    if (!string.IsNullOrWhiteSpace(username))
                    {
                        if (fileUsernames.Contains(username))
                        {
                            importResults.Failed++;
                            importResults.Errors.Add($"Row {row + 1}: Username '{username}' already exists in import file");
                            continue;
                        }
                        fileUsernames.Add(username);

                        // Kiểm tra username đã tồn tại trong hệ thống
                        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
                        if (existingUser != null)
                        {
                            importResults.Failed++;
                            importResults.Errors.Add($"Row {row + 1}: Username '{username}' already exists in system");
                            continue;
                        }
                    }

                    // Kiểm tra email toàn hệ thống
                    var existingUserByEmail = await _context.Users
                        .Include(u => u.Student)
                        .FirstOrDefaultAsync(u => u.Email == email);
                    
                    bool isExistingStudent = existingUserByEmail?.Student != null;

                    if (existingUserByEmail != null && !isExistingStudent)
                    {
                        importResults.Failed++;
                        importResults.Errors.Add($"Row {row + 1}: Email '{email}' is already used by another account (Teacher/Parent/Admin)");
                        continue;
                    }

                    int studentId;
                    if (!isExistingStudent)
                    {
                        var createStudentDto = new CreateStudentDto
                        {
                            Username = string.IsNullOrWhiteSpace(username) ? null : username,
                            Password = null, // Không tạo password khi import
                            FullName = fullName,
                            Email = email,
                            PhoneNumber = string.IsNullOrWhiteSpace(phoneNumber) ? null : phoneNumber,
                            EnrollmentStatus = "Active",
                            Grade = grade,
                            DateOfBirth = parsedDateOfBirth,
                            Gender = gender
                        };

                        var createdStudent = await _studentService.CreateStudentAsync(createStudentDto);
                        studentId = createdStudent.UserId ?? 0;
                        importResults.Success++;
                    }
                    else
                    {
                        studentId = existingUserByEmail!.Student!.UserId;
                        importResults.Skipped++;
                    }

                    // Thêm vào class nếu có classId
                    if (classId.HasValue && studentId > 0)
                    {
                        var targetClass = await _context.Classes
                            .Include(c => c.Students)
                            .FirstOrDefaultAsync(c => c.ClassId == classId.Value);

                        if (targetClass != null)
                        {
                            if (targetClass.Students == null) targetClass.Students = new List<Student>();

                            if (!targetClass.Students.Any(s => s.UserId == studentId))
                            {
                                var student = await _context.Students.FindAsync(studentId);
                                if (student != null)
                                {
                                    targetClass.Students.Add(student);
                                    await _context.SaveChangesAsync();
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    importResults.Failed++;
                    importResults.Errors.Add($"Row {row + 1}: Error - {ex.Message}");
                }
            }

            // Commit transaction
            if (importResults.Failed > 0 && importResults.Success == 0)
            {
                await transaction.RollbackAsync();
            }
            else
            {
                await transaction.CommitAsync();
            }
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }

        return new
        {
            message = "Import completed",
            importResults.Total,
            importResults.Success,
            importResults.Failed,
            importResults.Skipped,
            importResults.Errors,
            defaultPasswordNote = "Secure passwords generated only for students with username.",
            templateInfo = new
            {
                templateName = ImportTemplate.TEMPLATE_NAME,
                mappedHeaders = columnMapping.Keys.ToList()
            }
        };
    }
}
