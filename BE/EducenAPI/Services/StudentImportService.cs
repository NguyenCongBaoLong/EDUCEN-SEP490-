using System.Data;
using EducenAPI.DTOs.Students;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
using ExcelDataReader;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

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
        public List<string> Errors { get; set; } = new();
    }

    public async Task<object> ImportStudentsAsync(IFormFile file)
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

                if (string.IsNullOrWhiteSpace(username) ||
                    string.IsNullOrWhiteSpace(fullName) ||
                    string.IsNullOrWhiteSpace(email))
                {
                    importResults.Failed++;
                    importResults.Errors.Add($"Row {row + 1}: Missing required data (Username, Full Name, Email)");
                    continue;
                }

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

                if (!string.IsNullOrWhiteSpace(email))
                    fileEmails.Add(email);
                if (!string.IsNullOrWhiteSpace(username))
                    fileUsernames.Add(username);

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

                bool isExistingStudent = existingStudent != null;

                var createStudentDto = new CreateStudentDto
                {
                    Username = isExistingStudent ? "" : username,
                    FullName = fullName,
                    Email = email,
                    PhoneNumber = string.IsNullOrWhiteSpace(phoneNumber) ? null : phoneNumber,
                    Password = isExistingStudent ? "" : PasswordGenerator.GenerateSecurePassword(),
                    EnrollmentStatus = "Active",
                    Grade = grade,
                    DateOfBirth = parsedDateOfBirth,
                    Gender = gender
                };

                if (isExistingStudent)
                {
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

        return new
        {
            message = "Import completed",
            importResults,
            defaultPasswordNote = "Secure passwords have been generated for all imported students",
            templateInfo = new
            {
                templateName = ImportTemplate.TEMPLATE_NAME,
                // We return mapped headers keys, which is a detail consumers might use
                mappedHeaders = _context.Students.Select(_ => ImportTemplate.HEADER_MAPPING.Keys).FirstOrDefault()
            }
        };
    }
}

