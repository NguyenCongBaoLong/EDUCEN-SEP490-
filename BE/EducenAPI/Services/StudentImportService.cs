using System.Data;
using EducenAPI.DTOs.Students;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using EducenAPI.Ultils;
using ExcelDataReader;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using EducenAPI.Models;
using BCrypt.Net;

namespace EducenAPI.Services;

public class StudentImportService : IStudentImportService
{
    private readonly EducenV2Context _context;
    private readonly IStudentService _studentService;
    private readonly IClassService _classService;
    private readonly IParentService _parentService;

    public StudentImportService(
        EducenV2Context context,
        IStudentService studentService,
        IClassService classService,
        IParentService parentService)
    {
        _context = context;
        _studentService = studentService;
        _classService = classService;
        _parentService = parentService;
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
    /// Normalize grade input: trích xuất số từ "10A", "6B", "Khối 6" -> "Khối X"
    /// </summary>
    private string NormalizeGrade(string? gradeInput)
    {
        if (string.IsNullOrWhiteSpace(gradeInput))
            return string.Empty;

        var trimmed = gradeInput.Trim();

        // Nếu đã có "Khối" rồi thì giữ nguyên
        if (trimmed.Contains("Khối", StringComparison.OrdinalIgnoreCase))
            return trimmed;

        // Trích xuất số đầu tiên từ chuỗi (xử lý "10A", "6B", "6", "12A1")
        var match = System.Text.RegularExpressions.Regex.Match(trimmed, @"^(\d+)");
        if (match.Success && int.TryParse(match.Groups[1].Value, out int gradeNumber))
        {
            return $"Khối {gradeNumber}";
        }

        // Giữ nguyên các trường hợp khác
        return trimmed;
    }

    /// <summary>
    /// Insert grade vào bảng Grade nếu chưa tồn tại
    /// </summary>
    private async Task EnsureGradeExistsAsync(string gradeName)
    {
        if (string.IsNullOrWhiteSpace(gradeName))
            return;

        var existingGrade = await _context.Grades
            .FirstOrDefaultAsync(g => g.GradeName == gradeName);

        if (existingGrade == null)
        {
            var newGrade = new Grade
            {
                GradeName = gradeName
            };
            _context.Grades.Add(newGrade);
            await _context.SaveChangesAsync();
        }
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
                    importResults.Errors.Add($"Dòng {row + 1}: Dữ liệu dòng trống hoặc không hợp lệ");
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
                var gradeInput = GetValue("Grade");
                
                // Normalize grade: nếu là số (như "6") -> chuyển thành "Khối 6" để khớp với bảng Grade
                var grade = NormalizeGrade(gradeInput);
                
                // Insert grade vào bảng Grade nếu chưa tồn tại
                if (!string.IsNullOrWhiteSpace(grade))
                {
                    await EnsureGradeExistsAsync(grade);
                }
                
                var dateOfBirthRaw = GetValue("DateOfBirth");
                var gender = GetValue("Gender");
                
                // Parent Info
                var parentName = GetValue("ParentName");
                var parentPhone = GetValue("ParentPhone");
                var parentEmail = GetValue("ParentEmail");

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

                // --- Link Parent if info provided ---
                if (!string.IsNullOrWhiteSpace(parentName) && studentId > 0)
                {
                    var parentLinkError = await EnsureParentLinkedAsync(studentId, parentName, parentPhone, parentEmail);
                    if (parentLinkError != null)
                    {
                        // Nếu lỗi liên quan đến validate phụ huynh, ta coi như dòng này bị lỗi hoặc cảnh báo
                        // Ở đây ta chọn Fail dòng này để admin sửa lại data Excel cho chuẩn
                        importResults.Failed++;
                        importResults.Errors.Add($"{sheetName} - Dòng {row + 1}: {parentLinkError}");
                        continue; 
                    }
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
                importResults.Errors.Add($"{sheetName} - Dòng {row + 1}: Lỗi - {ex.Message}");
            }
        }
    }

    public async Task<object> ImportStudentsAsync(IFormFile file, int? classId = null)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("Chưa tải tệp lên");

        var extension = Path.GetExtension(file.FileName).ToLower();
        if (extension != ".xlsx" && extension != ".xls")
            throw new ArgumentException("Chỉ cho phép các tệp Excel (.xlsx, .xls)");

        var importResults = new ImportResults();

        System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);

        using var stream = file.OpenReadStream();
        using var reader = ExcelReaderFactory.CreateReader(stream);

        var dataSet = reader.AsDataSet();

        if (dataSet.Tables == null || dataSet.Tables.Count == 0)
            throw new ArgumentException("Tệp Excel không chứa dữ liệu");

        // Find ALL worksheets with valid headers
        var validWorksheets = FindAllWorksheetsWithValidHeaders(dataSet);
        
        if (validWorksheets.Count == 0)
        {
            throw new ArgumentException(
                "Không tìm thấy trang tính nào có tiêu đề hợp lệ. " +
                "Vui lòng đảm bảo tệp Excel có các tiêu đề: Username, Full Name, Email, Phone Number, Grade, DateOfBirth, Gender");
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
            message = $"Hoàn tất nhập dữ liệu từ {validWorksheets.Count} trang tính",
            importResults = new
            {
                Total = importResults.Total,
                Success = importResults.Success,
                Failed = importResults.Failed,
                Skipped = importResults.Skipped,
                SuccessRecords = importResults.SuccessRecords,
                Errors = importResults.Errors
            },
            defaultPasswordNote = "Mật khẩu bảo mật chỉ được tạo tự động cho các học sinh có tên đăng nhập.",
            templateInfo = new
            {
                templateName = ImportTemplate.TEMPLATE_NAME,
                worksheetsFound = validWorksheets.Count
            }
        };
    }

    private async Task<string?> EnsureParentLinkedAsync(int studentId, string parentName, string? parentPhone, string? parentEmail)
    {
        // 1. Validate format
        if (!string.IsNullOrWhiteSpace(parentEmail) && !IsValidEmail(parentEmail))
            return ValidationMessages.InvalidParentEmailFormat;
            
        if (!string.IsNullOrWhiteSpace(parentPhone) && !IsValidPhone(parentPhone))
            return ValidationMessages.InvalidParentPhoneFormat;

        // 2. Tìm phụ huynh đã tồn tại theo Phone hoặc Email
        User? parentUser = null;
        
        if (!string.IsNullOrWhiteSpace(parentPhone))
        {
            // Chỉ tìm phụ huynh trùng SĐT trong cùng Role Parent (RoleId = 4)
            parentUser = await _context.Users
                .Include(u => u.Parent)
                .ThenInclude(p => p.Students)
                .FirstOrDefaultAsync(u => u.PhoneNumber == parentPhone && u.RoleId == 4);
        }
        
        if (parentUser == null && !string.IsNullOrWhiteSpace(parentEmail))
        {
            // Tìm theo email (Email là duy nhất toàn hệ thống)
            parentUser = await _context.Users
                .Include(u => u.Parent)
                .ThenInclude(p => p.Students)
                .FirstOrDefaultAsync(u => u.Email == parentEmail);

            // Nếu tìm thấy User nhưng không phải role Phụ huynh -> Lỗi (Email trùng role khác)
            if (parentUser != null && parentUser.RoleId != 4)
                return ValidationMessages.EmailUsedByOtherRole;
        }

        // 3. Nếu không tìm thấy, tạo mới (với điều kiện Validate Uniqueness)
        if (parentUser == null)
        {
            // Kiểm tra trùng Email global lần nữa để chắc chắn (trường hợp email trùng với role không phải Parent)
            if (!string.IsNullOrWhiteSpace(parentEmail))
            {
                var emailExistsGlobal = await _context.Users.AnyAsync(u => u.Email == parentEmail);
                if (emailExistsGlobal) return ValidationMessages.DuplicateEmail;
            }

            // Generate username cho phụ huynh
            var usernameBase = !string.IsNullOrWhiteSpace(parentEmail) 
                ? parentEmail.Split('@')[0] 
                : $"par_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}_{new Random().Next(100, 999)}";
            
            var username = usernameBase;
            int counter = 1;
            while (await _context.Users.AnyAsync(u => u.Username == username))
            {
                username = $"{usernameBase}_{counter++}";
            }

            parentUser = new User
            {
                Username = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Edu123456"),
                FullName = parentName,
                Email = parentEmail,
                PhoneNumber = parentPhone,
                RoleId = 4, // Parent role
                AccountStatus = "NoAccount", // Không tạo tài khoản Active ngay
                IsAccountSent = false
            };

            _context.Users.Add(parentUser);
            await _context.SaveChangesAsync();

            var parent = new Parent
            {
                UserId = parentUser.UserId
            };
            _context.Parents.Add(parent);
            await _context.SaveChangesAsync();
            
            parentUser.Parent = parent;
        }

        // 4. Liên kết Student
        if (parentUser.Parent != null)
        {
            var student = await _context.Students.FindAsync(studentId);
            if (student != null)
            {
                if (parentUser.Parent.Students == null) parentUser.Parent.Students = new List<Student>();
                
                if (!parentUser.Parent.Students.Any(s => s.UserId == studentId))
                {
                    parentUser.Parent.Students.Add(student);
                    await _context.SaveChangesAsync();
                }
            }
        }
        
        return null; // Success
    }

    private bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }

    private bool IsValidPhone(string phone)
    {
        return System.Text.RegularExpressions.Regex.IsMatch(phone ?? "", @"^[\d\s\-\+\(\)]+$");
    }
}
