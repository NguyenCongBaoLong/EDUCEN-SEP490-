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
        public List<SuccessRecord> SuccessRecords { get; set; } = new();
        public List<string> Errors { get; set; } = new();
    }

    private sealed class SuccessRecord
    {
        public string SheetName { get; set; } = "";
        public int RowNumber { get; set; }
        public string Username { get; set; } = "";
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string PhoneNumber { get; set; } = "";
        public string Grade { get; set; } = "";
        public string DateOfBirth { get; set; } = "";
        public string Gender { get; set; } = "";
    }

    /// <summary>
    /// Find ALL worksheets with valid template headers (Username, Full Name, Email, etc.)
    /// </summary>
    private List<DataTable> FindAllWorksheetsWithValidHeaders(DataSet dataSet)
    {
        var validSheets = new List<DataTable>();

        // Find all sheets with valid headers AND has data rows
        for (int i = 0; i < dataSet.Tables.Count; i++)
        {
            var sheet = dataSet.Tables[i];
            
            if (sheet == null || sheet.Rows == null || sheet.Rows.Count <= 1)
                continue; // Skip sheets with no data rows

            var headerRow = sheet.Rows[0];
            if (headerRow == null || headerRow.ItemArray == null || headerRow.ItemArray.Length == 0)
                continue;

            var headers = new List<string>();
            for (int col = 0; col < headerRow.ItemArray.Length; col++)
            {
                headers.Add(headerRow.ItemArray[col]?.ToString()?.Trim() ?? "");
            }

            var validationResult = ImportTemplate.ValidateHeaders(headers);
            if (validationResult.IsValid)
            {
                validSheets.Add(sheet);
            }
        }

        return validSheets;
    }

    /// <summary>
    /// Process a single worksheet and import students
    /// </summary>
    private async Task ProcessWorksheetAsync(
        DataTable worksheet, 
        ImportResults importResults, 
        int? classId,
        HashSet<string> fileUsernames,
        HashSet<string> fileEmails)
    {
        var sheetName = worksheet.TableName ?? "Sheet";
        
        var columnMapping = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        
        // Build column mapping from headers
        var headerRow = worksheet.Rows[0];
        var actualHeaders = new List<string>();
        for (int col = 0; col < headerRow.ItemArray.Length; col++)
        {
            actualHeaders.Add(headerRow.ItemArray[col]?.ToString()?.Trim() ?? "");
        }
        
        for (int col = 0; col < actualHeaders.Count; col++)
        {
            var normalizedHeader = actualHeaders[col].ToLower().Trim();
            if (ImportTemplate.HEADER_MAPPING.TryGetValue(normalizedHeader, out var mappedHeader))
            {
                columnMapping[mappedHeader] = col;
            }
        }

        // Process each data row
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

                // Validate DateOfBirth
                DateTime? parsedDateOfBirth = null;
                if (!string.IsNullOrWhiteSpace(dateOfBirthRaw))
                {
                    if (DateTime.TryParse(dateOfBirthRaw, out DateTime dob))
                    {
                        if (dob.Date > DateTime.Now.Date)
                        {
                            importResults.Failed++;
                            importResults.Errors.Add($"{sheetName} - Row {row + 1}: {ValidationMessages.DateOfBirthInFuture}");
                            continue;
                        }
                        parsedDateOfBirth = dob;
                    }
                    else
                    {
                        importResults.Failed++;
                        importResults.Errors.Add($"{sheetName} - Row {row + 1}: {ValidationMessages.FormatInvalidDate(dateOfBirthRaw)}");
                        continue;
                    }
                }

                // Validation: FullName và Email là bắt buộc
                if (string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(email))
                {
                    importResults.Failed++;
                    importResults.Errors.Add($"{sheetName} - Row {row + 1}: {ValidationMessages.MissingRequiredData}");
                    continue;
                }

                // Validate duplicate username in file
                if (!string.IsNullOrWhiteSpace(username))
                {
                    if (fileUsernames.Contains(username))
                    {
                        importResults.Failed++;
                        importResults.Errors.Add($"{sheetName} - Row {row + 1}: {ValidationMessages.UsernameExistsInFile}");
                        continue;
                    }
                    fileUsernames.Add(username);

                    // Check username exists in system
                    var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
                    if (existingUser != null)
                    {
                        importResults.Failed++;
                        importResults.Errors.Add($"{sheetName} - Row {row + 1}: {ValidationMessages.UsernameExistsInSystem}");
                        continue;
                    }
                }

                // Check email in system
                var existingUserByEmail = await _context.Users
                    .Include(u => u.Student)
                    .FirstOrDefaultAsync(u => u.Email == email);
                
                bool isExistingStudent = existingUserByEmail?.Student != null;

                if (existingUserByEmail != null && !isExistingStudent)
                {
                    importResults.Failed++;
                    importResults.Errors.Add($"{sheetName} - Row {row + 1}: {ValidationMessages.EmailUsedByOtherRole}");
                    continue;
                }

                int studentId;
                if (!isExistingStudent)
                {
                    var createStudentDto = new CreateStudentDto
                    {
                        Username = string.IsNullOrWhiteSpace(username) ? null : username,
                        Password = null,
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
                    
                    // Track success record with full details
                    importResults.SuccessRecords.Add(new SuccessRecord
                    {
                        SheetName = sheetName,
                        RowNumber = row + 1,
                        Username = username ?? "",
                        FullName = fullName,
                        Email = email,
                        PhoneNumber = phoneNumber ?? "",
                        Grade = grade ?? "",
                        DateOfBirth = dateOfBirthRaw ?? "",
                        Gender = gender ?? ""
                    });
                }
                else
                {
                    studentId = existingUserByEmail!.Student!.UserId;
                    importResults.Skipped++;
                }

                // Add to class if classId provided
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
                importResults.Errors.Add($"{sheetName} - Row {row + 1}: Error - {ex.Message}");
            }
        }
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

        // Find ALL worksheets with valid headers
        var validWorksheets = FindAllWorksheetsWithValidHeaders(dataSet);
        
        if (validWorksheets.Count == 0)
        {
            throw new ArgumentException(
                "No worksheet with valid template headers found. " +
                "Please ensure your Excel file has a sheet with headers: Username, Full Name, Email, Phone Number, Grade, DateOfBirth, Gender");
        }

        // Shared HashSets across all sheets to detect duplicates in file
        var fileUsernames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var fileEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Use transaction for batch import - process ALL rows, don't rollback on errors
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Process all valid worksheets
            foreach (var worksheet in validWorksheets)
            {
                await ProcessWorksheetAsync(worksheet, importResults, classId, fileUsernames, fileEmails);
            }

            // Always commit - we want to save successful imports AND show all errors
            await transaction.CommitAsync();
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            // Still return what was processed before the error
            importResults.Errors.Add($"Lỗi hệ thống: {ex.Message}");
        }

        return new
        {
            message = $"Import completed from {validWorksheets.Count} worksheet(s)",
            importResults = new
            {
                Total = importResults.Total,
                Success = importResults.Success,
                Failed = importResults.Failed,
                Skipped = importResults.Skipped,
                SuccessRecords = importResults.SuccessRecords,
                Errors = importResults.Errors
            },
            defaultPasswordNote = "Secure passwords generated only for students with username.",
            templateInfo = new
            {
                templateName = ImportTemplate.TEMPLATE_NAME,
                worksheetsFound = validWorksheets.Count
            }
        };
    }
}
