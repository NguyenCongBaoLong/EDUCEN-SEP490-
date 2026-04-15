using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace EducenAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class InvoiceGenerationController : ControllerBase
    {
        private readonly EducenV2Context _context;
        private readonly ILogger<InvoiceGenerationController> _logger;

        public InvoiceGenerationController(
            EducenV2Context context,
            ILogger<InvoiceGenerationController> logger)
        {
            _context = context;
            _logger = logger;
            _logger.LogInformation("InvoiceGenerationController initialized");
        }

        /// <summary>
        /// Test endpoint - không cần auth
        /// </summary>
        [HttpGet("test")]
        [AllowAnonymous]
        public IActionResult Test()
        {
            _logger.LogInformation("Test endpoint called");
            return Ok(new { message = "InvoiceGenerationController is working!", timestamp = DateTime.Now });
        }

        /// <summary>
        /// Tạo hóa đơn hàng tháng thủ công (cho admin gọi)
        /// </summary>
        [HttpPost("generate")]
        [Authorize(Roles = "Admin")]
        [AllowAnonymous]
        public async Task<IActionResult> GenerateInvoices([FromBody] GenerateInvoicesRequest request)
        {
            try
            {
                var month = request.Month;
                var year = request.Year;

                _logger.LogInformation("Manual invoice generation for {Month}/{Year}", month, year);

                var classes = await _context.Classes
                    .Where(c => c.PricePerSession.HasValue && c.PricePerSession.Value > 0)
                    .ToListAsync();

                var totalInvoicesCreated = 0;
                var totalErrors = 0;

                foreach (var classEntity in classes)
                {
                    try
                    {
                        var students = await _context.Students
                            .Include(s => s.Classes)
                            .Where(s => s.Classes.Any(c => c.ClassId == classEntity.ClassId))
                            .ToListAsync();

                        foreach (var student in students)
                        {
                            try
                            {
                                var existingInvoice = await _context.TuitionInvoices
                                    .FirstOrDefaultAsync(i =>
                                        i.StudentId == student.UserId &&
                                        i.ClassId == classEntity.ClassId &&
                                        i.InvoiceMonth == month &&
                                        i.InvoiceYear == year);

                                if (existingInvoice != null)
                                {
                                    _logger.LogDebug("Invoice already exists for student {StudentId}, class {ClassId}", 
                                        student.UserId, classEntity.ClassId);
                                    continue;
                                }

                                var startOfMonth = new DateTime(year, month, 1);
                                var startOfNextMonth = startOfMonth.AddMonths(1);

                                var sessions = await _context.ClassSessions
                                    .Include(s => s.Attendances)
                                    .Where(s => s.Schedule.ClassId == classEntity.ClassId &&
                                                s.SessionDate >= startOfMonth &&
                                                s.SessionDate < startOfNextMonth)
                                    .ToListAsync();

                                var attendedSessions = 0;
                                foreach (var session in sessions)
                                {
                                    var attendance = session.Attendances?.FirstOrDefault(a => a.StudentId == student.UserId);
                                    var status = attendance?.Status ?? "Absent";
                                    if (status == "present" || status == "Attended")
                                        attendedSessions++;
                                }

                                if (attendedSessions == 0)
                                {
                                    _logger.LogDebug("Student {StudentId} has no attended sessions, skipping invoice", student.UserId);
                                    continue;
                                }

                                var totalAmount = attendedSessions * classEntity.PricePerSession.Value;
                                var dueDate = new DateTime(year, month, 1).AddMonths(1).AddDays(10);

                                var invoice = new Models.TuitionInvoice
                                {
                                    InvoiceId = Guid.NewGuid().ToString(),
                                    StudentId = student.UserId,
                                    ClassId = classEntity.ClassId,
                                    InvoiceMonth = month,
                                    InvoiceYear = year,
                                    TotalSessions = sessions.Count,
                                    AttendedSessions = attendedSessions,
                                    AbsentSessions = sessions.Count - attendedSessions,
                                    PricePerSession = classEntity.PricePerSession.Value,
                                    TotalAmount = totalAmount,
                                    DiscountAmount = 0,
                                    FinalAmount = totalAmount,
                                    Status = "Draft",
                                    DueDate = dueDate,
                                    CreatedAt = DateTime.UtcNow,
                                    CreatedBy = "System"
                                };

                                _context.TuitionInvoices.Add(invoice);
                                totalInvoicesCreated++;

                                _logger.LogInformation("Created invoice for student {StudentId}, class {ClassId}, amount: {Amount}",
                                    student.UserId, classEntity.ClassId, totalAmount);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Error creating invoice for student {StudentId} in class {ClassId}",
                                    student.UserId, classEntity.ClassId);
                                totalErrors++;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing class {ClassId}", classEntity.ClassId);
                        totalErrors++;
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new { 
                    message = $"Đã tạo hóa đơn thành công",
                    invoicesCreated = totalInvoicesCreated,
                    errors = totalErrors,
                    month = month,
                    year = year
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate monthly invoices");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy thông tin các lớp có thể tạo hóa đơn
        /// </summary>
        [HttpGet("preview")]
        [Authorize(Roles = "Admin")]
        [AllowAnonymous] // Temp for testing
        public async Task<IActionResult> PreviewInvoices([FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                var classes = await _context.Classes
                    .Where(c => c.PricePerSession.HasValue && c.PricePerSession.Value > 0)
                    .Include(c => c.Students)
                    .ToListAsync();

                var previewData = classes.Select(c => new 
                {
                    classId = c.ClassId,
                    className = c.ClassName,
                    pricePerSession = c.PricePerSession,
                    studentCount = c.Students.Count,
                    existingInvoices = _context.TuitionInvoices
                        .Count(i => i.ClassId == c.ClassId && i.InvoiceMonth == month && i.InvoiceYear == year)
                }).ToList();

                return Ok(new {
                    month,
                    year,
                    classes = previewData,
                    totalClasses = previewData.Count,
                    totalStudents = previewData.Sum(p => p.studentCount)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error previewing invoices");
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class GenerateInvoicesRequest
    {
        public int Month { get; set; }
        public int Year { get; set; }
    }
}