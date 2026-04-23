using EducenAPI.DTOs.Invoice;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class InvoiceService : IInvoiceService
    {
        private readonly EducenV2Context _context;
        private readonly ITuitionService _tuitionService;
        private readonly ILogger<InvoiceService> _logger;

        public InvoiceService(
            EducenV2Context context,
            ITuitionService tuitionService,
            ILogger<InvoiceService> logger)
        {
            _context = context;
            _tuitionService = tuitionService;
            _logger = logger;
        }

        public async Task<TuitionInvoice> CreateInvoiceAsync(CreateInvoiceRequest request)
        {
            // Check if invoice already exists for this student/class/month/year
            var existingInvoice = await _context.TuitionInvoices
                .FirstOrDefaultAsync(i =>
                    i.StudentId == request.StudentId &&
                    i.ClassId == request.ClassId &&
                    i.InvoiceMonth == request.Month &&
                    i.InvoiceYear == request.Year);

            if (existingInvoice != null)
                throw new Exception("Hóa đơn đã tồn tại cho học sinh, lớp học và tháng này.");

            // Calculate tuition
            var calculation = await _tuitionService.CalculateTuitionAsync(
                request.StudentId, request.ClassId, request.Month, request.Year);

            // Create invoice
            var invoice = new TuitionInvoice
            {
                InvoiceId = Guid.NewGuid().ToString(),
                StudentId = request.StudentId,
                ClassId = request.ClassId,
                InvoiceMonth = request.Month,
                InvoiceYear = request.Year,
                TotalSessions = calculation.TotalSessions,
                AttendedSessions = calculation.AttendedSessions,
                AbsentSessions = calculation.AbsentSessions,
                ExcusedSessions = calculation.ExcusedSessions,
                PricePerSession = calculation.PricePerSession,
                TotalAmount = calculation.TotalAmount,
                DiscountAmount = request.DiscountAmount ?? 0,
                FinalAmount = calculation.TotalAmount - (request.DiscountAmount ?? 0),
                Status = "Draft",
                DueDate = new DateTime(request.Year, request.Month, 1).AddMonths(1).AddDays(10), // Due 10th of next month
                CreatedAt = DateTime.UtcNow,
                CreatedBy = request.CreatedBy,
                Notes = request.Notes
            };

            // Add invoice items
            foreach (var detail in calculation.SessionDetails.Where(d => d.Amount > 0))
            {
                invoice.Items.Add(new TuitionInvoiceItem
                {
                    SessionId = detail.SessionId,
                    SessionDate = detail.SessionDate,
                    Status = detail.Status,
                    Amount = detail.Amount
                });
            }

            _context.TuitionInvoices.Add(invoice);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created invoice {InvoiceId} for student {StudentId}",
                invoice.InvoiceId, request.StudentId);

            return invoice;
        }

        public async Task<BatchInvoiceResult> CreateBatchInvoicesAsync(BatchInvoiceRequest request)
        {
            var result = new BatchInvoiceResult();
            var calculations = await _tuitionService.CalculateClassTuitionAsync(
                request.ClassId, request.Month, request.Year);

            // Lọc theo StudentIds nếu có
            if (request.StudentIds != null && request.StudentIds.Any())
            {
                calculations = calculations.Where(c => request.StudentIds.Contains(c.StudentId)).ToList();
            }

            result.TotalStudents = calculations.Count;

            foreach (var calc in calculations)
            {
                try
                {
                    // Skip if no sessions attended
                    if (calc.AttendedSessions == 0)
                    {
                        result.Errors.Add($"Học sinh {calc.StudentName} chưa tham gia buổi học nào.");
                        result.FailedCount++;
                        continue;
                    }

                    // Check if invoice already exists
                    var existing = await _context.TuitionInvoices
                        .FirstOrDefaultAsync(i =>
                            i.StudentId == calc.StudentId &&
                            i.ClassId == request.ClassId &&
                            i.InvoiceMonth == request.Month &&
                            i.InvoiceYear == request.Year);

                    if (existing != null)
                    {
                        result.Errors.Add($"Hóa đơn đã tồn tại cho học sinh {calc.StudentName}.");
                        result.FailedCount++;
                        continue;
                    }

                    // Create invoice
                    var invoice = await CreateInvoiceAsync(new CreateInvoiceRequest
                    {
                        StudentId = calc.StudentId,
                        ClassId = request.ClassId,
                        Month = request.Month,
                        Year = request.Year,
                        CreatedBy = request.CreatedBy
                    });

                    result.CreatedInvoiceIds.Add(invoice.InvoiceId);
                    result.SuccessCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error creating invoice for student {StudentId}", calc.StudentId);
                    result.Errors.Add($"Lỗi cho {calc.StudentName}: {ex.Message}");
                    result.FailedCount++;
                }
            }

            return result;
        }

        public async Task<TuitionInvoice?> GetInvoiceAsync(string invoiceId)
        {
            return await _context.TuitionInvoices
                .Include(i => i.Student)
                    .ThenInclude(s => s.StudentNavigation)
                .Include(i => i.Class)
                .Include(i => i.Items)
                .FirstOrDefaultAsync(i => i.InvoiceId == invoiceId);
        }

        public async Task<List<TuitionInvoice>> GetInvoicesAsync(InvoiceFilterRequest filter)
        {
            var studentId = NormalizePositiveInt(filter.StudentId);
            var classId = NormalizePositiveInt(filter.ClassId);
            var month = NormalizePositiveInt(filter.Month);
            var year = NormalizePositiveInt(filter.Year);
            var status = NormalizeString(filter.Status);

            var query = _context.TuitionInvoices
                .Include(i => i.Student)
                    .ThenInclude(s => s.StudentNavigation)
                .Include(i => i.Class)
                .AsQueryable();

            if (studentId.HasValue)
                query = query.Where(i => i.StudentId == studentId.Value);

            if (classId.HasValue)
                query = query.Where(i => i.ClassId == classId.Value);

            if (month.HasValue)
                query = query.Where(i => i.InvoiceMonth == month.Value);

            if (year.HasValue)
                query = query.Where(i => i.InvoiceYear == year.Value);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(i => i.Status == status);

            if (filter.FromDate.HasValue)
                query = query.Where(i => i.CreatedAt >= filter.FromDate.Value);

            if (filter.ToDate.HasValue)
                query = query.Where(i => i.CreatedAt <= filter.ToDate.Value);

            if (filter.IsOverdue.HasValue && filter.IsOverdue.Value)
                query = query.Where(i => i.Status == "Overdue" ||
                    (i.Status == "Sent" && i.DueDate < DateTime.UtcNow));

            return await query.OrderByDescending(i => i.CreatedAt).ToListAsync();
        }

        private static int? NormalizePositiveInt(int? value)
        {
            if (!value.HasValue || value.Value <= 0)
                return null;
            return value.Value;
        }

        private static string? NormalizeString(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return null;
            return value.Trim();
        }

        public async Task<bool> MarkAsPaidAsync(string invoiceId, string paymentRecordId)
        {
            var invoice = await _context.TuitionInvoices.FindAsync(invoiceId);
            if (invoice == null) return false;

            invoice.Status = "Paid";
            invoice.PaidAt = DateTime.UtcNow;
            invoice.PaymentRecordId = paymentRecordId;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> MarkInvoiceAsPaidAsync(string invoiceId, string paymentMethod, string? notes)
        {
            var invoice = await _context.TuitionInvoices.FindAsync(invoiceId);
            if (invoice == null) return false;

            if (invoice.Status == "Paid")
                return false; // Already paid

            invoice.Status = "Paid";
            invoice.PaidAt = DateTime.UtcNow;
            invoice.Notes = notes;
            invoice.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> CancelInvoiceAsync(string invoiceId, string reason)
        {
            var invoice = await _context.TuitionInvoices.FindAsync(invoiceId);
            if (invoice == null) return false;

            if (invoice.Status == "Paid")
                throw new Exception("Không thể hủy hóa đơn đã thanh toán.");

            invoice.Status = "Cancelled";
            invoice.UpdatedAt = DateTime.UtcNow;
            invoice.Notes = string.IsNullOrEmpty(invoice.Notes)
                ? $"Đã hủy: {reason}"
                : $"{invoice.Notes}\nĐã hủy: {reason}";

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SendInvoiceAsync(string invoiceId)
        {
            var invoice = await _context.TuitionInvoices.FindAsync(invoiceId);
            if (invoice == null) return false;

            if (invoice.Status == "Draft")
            {
                invoice.Status = "Sent";
                invoice.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            // TODO: Send email notification to student/parent
            _logger.LogInformation("Invoice {InvoiceId} sent to student {StudentId}",
                invoiceId, invoice.StudentId);

            return true;
        }

        public async Task<List<TuitionInvoice>> GetUpcomingDueInvoicesAsync(int daysBefore)
        {
            var targetDate = DateTime.UtcNow.AddDays(daysBefore).Date;

            return await _context.TuitionInvoices
                .Include(i => i.Student)
                    .ThenInclude(s => s.StudentNavigation)
                .Include(i => i.Class)
                .Where(i => i.Status == "Sent" &&
                           i.DueDate.Date == targetDate)
                .ToListAsync();
        }

        /// <summary>
        /// Cập nhật tự động các hóa đơn quá hạn
        /// Chạy hàng ngày để cập nhật status từ "Sent" -> "Overdue"
        /// </summary>
        public async Task<int> UpdateOverdueInvoicesAsync()
        {
            var overdueInvoices = await _context.TuitionInvoices
                .Where(i => i.Status == "Sent" && i.DueDate < DateTime.UtcNow)
                .ToListAsync();

            if (overdueInvoices.Any())
            {
                foreach (var invoice in overdueInvoices)
                {
                    invoice.Status = "Overdue";
                    invoice.UpdatedAt = DateTime.UtcNow;
                    
                    _logger.LogInformation("Invoice {InvoiceId} marked as overdue. DueDate: {DueDate}, Current: {CurrentDate}",
                        invoice.InvoiceId, invoice.DueDate, DateTime.UtcNow);
                }

                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Updated {Count} invoices to overdue status", overdueInvoices.Count);
            }

            return overdueInvoices.Count;
        }

        public async Task<FamilyInvoiceResult> CreateFamilyInvoiceAsync(string ownerUserId, CreateFamilyInvoiceRequest request, string requesterRole = "Parent")
        {
            try
            {
                if (!int.TryParse(ownerUserId, out var requesterUserId))
                    return new FamilyInvoiceResult
                    {
                        Success = false,
                        Message = "Không xác định được người dùng hợp lệ."
                    };

                var isStudentRequester = string.Equals(requesterRole, "Student", StringComparison.OrdinalIgnoreCase)
                                         && !string.Equals(requesterRole, "Parent", StringComparison.OrdinalIgnoreCase);

                string invoiceOwnerId;
                List<int> ownerStudentIds;

                if (isStudentRequester)
                {
                    var studentExists = await _context.Students.AnyAsync(s => s.UserId == requesterUserId);
                    if (!studentExists)
                    {
                        return new FamilyInvoiceResult
                        {
                            Success = false,
                            Message = "Không tìm thấy thông tin học sinh."
                        };
                    }

                    if (!string.Equals(request.Type, "Student", StringComparison.Ordinal))
                    {
                        return new FamilyInvoiceResult
                        {
                            Success = false,
                            Message = "Học sinh chỉ được tạo hóa đơn gộp loại 'Student'."
                        };
                    }

                    if (request.StudentIds != null && request.StudentIds.Any(id => id != requesterUserId))
                    {
                        return new FamilyInvoiceResult
                        {
                            Success = false,
                            Message = "Danh sách học sinh chỉ được chứa chính học sinh hiện tại."
                        };
                    }

                    invoiceOwnerId = requesterUserId.ToString();
                    ownerStudentIds = new List<int> { requesterUserId };
                }
                else
                {
                    // Validate parent exists
                    var parent = await _context.Parents
                        .FirstOrDefaultAsync(p => p.UserId == requesterUserId);

                    if (parent == null)
                        return new FamilyInvoiceResult
                        {
                            Success = false,
                            Message = "Không tìm thấy thông tin phụ huynh."
                        };

                    ownerStudentIds = await _context.Set<Dictionary<string, object>>("ParentStudent")
                        .Where(ps => EF.Property<int>(ps, "ParentsUserId") == requesterUserId)
                        .Select(ps => EF.Property<int>(ps, "StudentsUserId"))
                        .ToListAsync();

                    if (!ownerStudentIds.Any())
                        return new FamilyInvoiceResult
                        {
                            Success = false,
                            Message = "Không tìm thấy học sinh nào thuộc phụ huynh này."
                        };

                    invoiceOwnerId = parent.UserId.ToString();
                }

                // Validate type
                if (request.Type != "Student" && request.Type != "Family")
                    return new FamilyInvoiceResult
                    {
                        Success = false,
                        Message = "Loại hóa đơn không hợp lệ. Chỉ chấp nhận 'Student' hoặc 'Family'."
                    };

                // Resolve selected invoice IDs
                var selectedInvoiceIds = request.SelectedTuitionInvoiceIds?
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .Select(id => id.Trim())
                    .Distinct()
                    .ToList() ?? new List<string>();

                // Backward compatibility fallback: derive from StudentIds + Month + Year
                if (!selectedInvoiceIds.Any())
                {
                    if (isStudentRequester)
                    {
                        selectedInvoiceIds = await _context.TuitionInvoices
                            .Where(i => i.StudentId == requesterUserId
                                        && i.InvoiceMonth == request.Month
                                        && i.InvoiceYear == request.Year
                                        && (i.Status == "Sent" || i.Status == "Overdue"))
                            .Select(i => i.InvoiceId)
                            .Distinct()
                            .ToListAsync();
                    }
                    else
                    {
                        if (request.StudentIds == null || !request.StudentIds.Any())
                            return new FamilyInvoiceResult
                            {
                                Success = false,
                                Message = "Danh sách hóa đơn học phí được chọn không hợp lệ."
                            };

                        selectedInvoiceIds = await _context.TuitionInvoices
                            .Where(i => request.StudentIds.Contains(i.StudentId)
                                        && i.InvoiceMonth == request.Month
                                        && i.InvoiceYear == request.Year
                                        && (i.Status == "Sent" || i.Status == "Overdue"))
                            .Select(i => i.InvoiceId)
                            .Distinct()
                            .ToListAsync();
                    }
                }

                if (!selectedInvoiceIds.Any())
                    return new FamilyInvoiceResult
                    {
                        Success = false,
                        Message = "Không tìm thấy hóa đơn nào để gộp."
                    };

                // Load selected invoices
                var studentInvoices = await _context.TuitionInvoices
                    .Where(i => selectedInvoiceIds.Contains(i.InvoiceId))
                    .ToListAsync();

                if (studentInvoices.Count != selectedInvoiceIds.Count)
                {
                    var foundIds = studentInvoices.Select(i => i.InvoiceId).ToHashSet();
                    var missingCount = selectedInvoiceIds.Count(id => !foundIds.Contains(id));
                    return new FamilyInvoiceResult
                    {
                        Success = false,
                        Message = $"Có {missingCount} hóa đơn học phí không tồn tại hoặc không truy cập được."
                    };
                }

                // Ownership validation
                var ownerStudentSet = ownerStudentIds.ToHashSet();
                if (studentInvoices.Any(i => !ownerStudentSet.Contains(i.StudentId)))
                    return new FamilyInvoiceResult
                    {
                        Success = false,
                        Message = isStudentRequester
                            ? "Danh sách hóa đơn có phần tử không thuộc học sinh hiện tại."
                            : "Danh sách hóa đơn có phần tử không thuộc học sinh của phụ huynh."
                    };

                // Integrity validation: month/year + allowed status only
                if (studentInvoices.Any(i => i.InvoiceMonth != request.Month || i.InvoiceYear != request.Year))
                    return new FamilyInvoiceResult
                    {
                        Success = false,
                        Message = "Chỉ được gộp hóa đơn đúng tháng/năm đã chọn."
                    };

                if (studentInvoices.Any(i => i.Status == "Paid" || (i.Status != "Sent" && i.Status != "Overdue")))
                    return new FamilyInvoiceResult
                    {
                        Success = false,
                        Message = "Chỉ được chọn hóa đơn trạng thái Sent/Overdue và chưa thanh toán."
                    };

                // Overlap guard: same TuitionInvoice cannot be in another active pending FamilyInvoice
                var overlappingInvoiceIds = await _context.FamilyInvoiceItems
                    .Where(item => selectedInvoiceIds.Contains(item.StudentInvoiceId)
                                   && item.FamilyInvoice.Status == "Pending")
                    .Select(item => item.StudentInvoiceId)
                    .Distinct()
                    .ToListAsync();

                if (overlappingInvoiceIds.Any())
                    return new FamilyInvoiceResult
                    {
                        Success = false,
                        Message = "Một hoặc nhiều hóa đơn đã nằm trong hóa đơn gộp đang chờ thanh toán."
                    };

                var selectedStudentIds = studentInvoices
                    .Select(i => i.StudentId)
                    .Distinct()
                    .ToList();

                var studentNameById = await _context.Students
                    .Include(s => s.StudentNavigation)
                    .Where(s => selectedStudentIds.Contains(s.UserId))
                    .ToDictionaryAsync(
                        s => s.UserId,
                        s => s.StudentNavigation != null && !string.IsNullOrWhiteSpace(s.StudentNavigation.FullName)
                            ? s.StudentNavigation.FullName
                            : "Unknown");

                if (request.Type == "Student" && selectedStudentIds.Count > 1)
                {
                    return new FamilyInvoiceResult
                    {
                        Success = false,
                        Message = "Loại Student chỉ cho phép gộp hóa đơn của một học sinh."
                    };
                }

                // Create family invoice
                var familyInvoice = new FamilyInvoice
                {
                    InvoiceId = Guid.NewGuid().ToString(),
                    ParentId = invoiceOwnerId,
                    Type = request.Type,
                    Month = request.Month,
                    Year = request.Year,
                    TotalAmount = studentInvoices.Sum(i => i.FinalAmount),
                    StudentCount = request.Type == "Student" ? 1 : selectedStudentIds.Count,
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow,
                    Notes = request.Notes
                };

                // Add family invoice items
                foreach (var invoice in studentInvoices)
                {
                    familyInvoice.StudentInvoices.Add(new FamilyInvoiceItem
                    {
                        FamilyInvoiceId = familyInvoice.InvoiceId,
                        StudentInvoiceId = invoice.InvoiceId,
                        StudentId = invoice.StudentId,
                        StudentName = studentNameById.TryGetValue(invoice.StudentId, out var studentName)
                            ? studentName
                            : "Unknown",
                        Amount = invoice.FinalAmount,
                        Status = "Pending",
                        CreatedAt = DateTime.UtcNow
                    });
                }

                _context.FamilyInvoices.Add(familyInvoice);
                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "Created {Type} family invoice {InvoiceId} for owner {OwnerId} (role: {Role}) with {Count} items, total: {Total}",
                    request.Type, familyInvoice.InvoiceId, familyInvoice.ParentId,
                    requesterRole, familyInvoice.StudentInvoices.Count, familyInvoice.TotalAmount);

                return new FamilyInvoiceResult
                {
                    Success = true,
                    InvoiceId = familyInvoice.InvoiceId,
                    TotalAmount = familyInvoice.TotalAmount,
                    StudentCount = familyInvoice.StudentCount
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating family invoice for owner {OwnerUserId}", ownerUserId);
                return new FamilyInvoiceResult
                {
                    Success = false,
                    Message = ex.Message
                };
            }
        }

        public async Task<List<FamilyInvoice>> GetFamilyInvoicesAsync(string ownerUserId, string? type = null, string requesterRole = "Parent")
        {
            if (!int.TryParse(ownerUserId, out var requesterUserId))
                return new List<FamilyInvoice>();

            if (string.Equals(requesterRole, "Student", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(requesterRole, "Parent", StringComparison.OrdinalIgnoreCase))
            {
                var studentExists = await _context.Students.AnyAsync(s => s.UserId == requesterUserId);
                if (!studentExists)
                    return new List<FamilyInvoice>();
            }

            var query = _context.FamilyInvoices
                .Include(fi => fi.StudentInvoices)
                .Where(fi => fi.ParentId == ownerUserId);

            if (!string.IsNullOrWhiteSpace(type))
                query = query.Where(fi => fi.Type == type);

            return await query
                .OrderByDescending(fi => fi.CreatedAt)
                .ToListAsync();
        }

        public async Task<bool> PayFamilyInvoiceAsync(string parentId, string invoiceId, string paymentMethod, string? notes)
        {
            try
            {
                var familyInvoice = await _context.FamilyInvoices
                    .Include(fi => fi.StudentInvoices)
                    .FirstOrDefaultAsync(fi => fi.InvoiceId == invoiceId && fi.ParentId == parentId);

                if (familyInvoice == null)
                {
                    _logger.LogWarning("PayFamilyInvoice denied or not found. ParentId: {ParentId}, InvoiceId: {InvoiceId}", parentId, invoiceId);
                    return false;
                }

                if (familyInvoice.Status != "Pending")
                    return false;

                // Update family invoice status
                familyInvoice.Status = "Paid";
                familyInvoice.PaidAt = DateTime.UtcNow;
                familyInvoice.UpdatedAt = DateTime.UtcNow;
                familyInvoice.Notes = notes;

                // Update all student invoice statuses to "Paid"
                foreach (var item in familyInvoice.StudentInvoices)
                {
                    var studentInvoice = await _context.TuitionInvoices
                        .FirstOrDefaultAsync(i => i.InvoiceId == item.StudentInvoiceId);

                    if (studentInvoice != null)
                    {
                        studentInvoice.Status = "Paid";
                        studentInvoice.PaidAt = DateTime.UtcNow;
                        studentInvoice.PaymentRecordId = familyInvoice.PaymentRecordId;
                        studentInvoice.UpdatedAt = DateTime.UtcNow;
                    }

                    item.Status = "Paid";
                    item.PaidAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Paid {Type} family invoice {InvoiceId} for parent {ParentId}",
                    familyInvoice.Type, invoiceId, familyInvoice.ParentId);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error paying family invoice {InvoiceId}", invoiceId);
                return false;
            }
        }

        public async Task<FamilyInvoiceResult> CancelFamilyInvoiceAsync(string ownerUserId, string invoiceId, string? reason, string requesterRole = "Parent")
        {
            try
            {
                if (string.IsNullOrWhiteSpace(ownerUserId))
                {
                    return new FamilyInvoiceResult
                    {
                        Success = false,
                        Message = "Không xác định được người dùng hợp lệ."
                    };
                }

                if (!int.TryParse(ownerUserId, out var ownerUserIdInt))
                {
                    return new FamilyInvoiceResult
                    {
                        Success = false,
                        Message = "Không xác định được người dùng hợp lệ."
                    };
                }

                var isStudentRequester = string.Equals(requesterRole, "Student", StringComparison.OrdinalIgnoreCase)
                                         && !string.Equals(requesterRole, "Parent", StringComparison.OrdinalIgnoreCase);

                if (isStudentRequester)
                {
                    var studentExists = await _context.Students.AnyAsync(s => s.UserId == ownerUserIdInt);
                    if (!studentExists)
                    {
                        return new FamilyInvoiceResult
                        {
                            Success = false,
                            Message = "Không tìm thấy thông tin học sinh."
                        };
                    }
                }
                else
                {
                    var parentExists = await _context.Parents.AnyAsync(p => p.UserId == ownerUserIdInt);
                    if (!parentExists)
                    {
                        return new FamilyInvoiceResult
                        {
                            Success = false,
                            Message = "Không tìm thấy thông tin phụ huynh."
                        };
                    }
                }

                if (string.IsNullOrWhiteSpace(invoiceId))
                {
                    return new FamilyInvoiceResult
                    {
                        Success = false,
                        Message = "Mã hóa đơn gộp không hợp lệ."
                    };
                }

                var familyInvoice = await _context.FamilyInvoices
                    .FirstOrDefaultAsync(fi => fi.InvoiceId == invoiceId);

                if (familyInvoice == null)
                {
                    return new FamilyInvoiceResult
                    {
                        Success = false,
                        Message = "Không tìm thấy hóa đơn gộp cần hủy."
                    };
                }

                if (!string.Equals(familyInvoice.ParentId, ownerUserId, StringComparison.Ordinal))
                {
                    return new FamilyInvoiceResult
                    {
                        Success = false,
                        Message = "Bạn không có quyền hủy hóa đơn gộp này."
                    };
                }

                if (!string.Equals(familyInvoice.Status, "Pending", StringComparison.OrdinalIgnoreCase))
                {
                    return new FamilyInvoiceResult
                    {
                        Success = false,
                        Message = "Chỉ có thể hủy hóa đơn gộp ở trạng thái Pending."
                    };
                }

                familyInvoice.Status = "Cancelled";
                familyInvoice.UpdatedAt = DateTime.UtcNow;

                if (!string.IsNullOrWhiteSpace(reason))
                {
                    familyInvoice.Notes = string.IsNullOrWhiteSpace(familyInvoice.Notes)
                        ? $"Đã hủy: {reason.Trim()}"
                        : $"{familyInvoice.Notes}\nĐã hủy: {reason.Trim()}";
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "Cancelled family invoice {InvoiceId} by owner {OwnerUserId} (role: {Role})",
                    invoiceId,
                    ownerUserId,
                    requesterRole);

                return new FamilyInvoiceResult
                {
                    Success = true,
                    InvoiceId = familyInvoice.InvoiceId,
                    Message = "Hủy hóa đơn gộp thành công."
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error cancelling family invoice {InvoiceId} by owner {OwnerUserId} (role: {Role})",
                    invoiceId,
                    ownerUserId,
                    requesterRole);
                return new FamilyInvoiceResult
                {
                    Success = false,
                    Message = "Có lỗi xảy ra khi hủy hóa đơn gộp."
                };
            }
        }
    }
}