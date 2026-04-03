using EducenAPI.DTOs.Invoice;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
using EducenAPI.Services.Interface;
using EduCenAPI.Tests.Fakes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

public class InvoiceService_FamilyInvoice_Tests
{
    private static EducenV2Context GetDbContext()
    {
        var options = new DbContextOptionsBuilder<EducenV2Context>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new EducenV2Context(options, new FakeTenantService());
    }

    private static InvoiceService GetService(EducenV2Context context)
    {
        return new InvoiceService(context, new FakeTuitionService(), NullLogger<InvoiceService>.Instance);
    }

    [Fact]
    public async Task CreateAndPayFamilyInvoice_AOnlyThreeInvoices_ShouldSucceed()
    {
        var context = GetDbContext();
        SeedReferenceData(context);
        SeedParentChildren(context, 10, 101);

        context.TuitionInvoices.AddRange(
            CreateInvoice("a-1", 101, 4, 2026, "Sent", 100),
            CreateInvoice("a-2", 101, 4, 2026, "Overdue", 120),
            CreateInvoice("a-3", 101, 4, 2026, "Sent", 80));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var create = await service.CreateFamilyInvoiceAsync("10", new CreateFamilyInvoiceRequest
        {
            Type = "Student",
            Month = 4,
            Year = 2026,
            SelectedTuitionInvoiceIds = new List<string> { "a-1", "a-2", "a-3" }
        });

        Assert.True(create.Success, create.Message);

        var paid = await service.PayFamilyInvoiceAsync(create.InvoiceId, "Cash", "pay a");
        Assert.True(paid);

        var familyInvoice = await context.FamilyInvoices
            .Include(fi => fi.StudentInvoices)
            .FirstAsync(fi => fi.InvoiceId == create.InvoiceId);

        Assert.Equal("Paid", familyInvoice.Status);
        Assert.Equal(3, familyInvoice.StudentInvoices.Count);
        Assert.All(familyInvoice.StudentInvoices, item => Assert.Equal("Paid", item.Status));

        var childInvoices = await context.TuitionInvoices
            .Where(i => i.InvoiceId == "a-1" || i.InvoiceId == "a-2" || i.InvoiceId == "a-3")
            .ToListAsync();
        Assert.All(childInvoices, inv => Assert.Equal("Paid", inv.Status));
    }

    [Fact]
    public async Task CreateAndPayFamilyInvoice_BOnlyFourInvoicesAfterAPaid_ShouldSucceed()
    {
        var context = GetDbContext();
        SeedReferenceData(context);
        SeedParentChildren(context, 10, 101, 102);

        context.TuitionInvoices.AddRange(
            CreateInvoice("a-1", 101, 4, 2026, "Sent", 90),
            CreateInvoice("a-2", 101, 4, 2026, "Sent", 110),
            CreateInvoice("a-3", 101, 4, 2026, "Overdue", 70),
            CreateInvoice("b-1", 102, 4, 2026, "Sent", 100),
            CreateInvoice("b-2", 102, 4, 2026, "Overdue", 130),
            CreateInvoice("b-3", 102, 4, 2026, "Sent", 80),
            CreateInvoice("b-4", 102, 4, 2026, "Sent", 60));
        await context.SaveChangesAsync();

        var service = GetService(context);

        var createA = await service.CreateFamilyInvoiceAsync("10", new CreateFamilyInvoiceRequest
        {
            Type = "Student",
            Month = 4,
            Year = 2026,
            SelectedTuitionInvoiceIds = new List<string> { "a-1", "a-2", "a-3" }
        });
        Assert.True(createA.Success, createA.Message);
        Assert.True(await service.PayFamilyInvoiceAsync(createA.InvoiceId, "Cash", "pay a"));

        var createB = await service.CreateFamilyInvoiceAsync("10", new CreateFamilyInvoiceRequest
        {
            Type = "Student",
            Month = 4,
            Year = 2026,
            SelectedTuitionInvoiceIds = new List<string> { "b-1", "b-2", "b-3", "b-4" }
        });

        Assert.True(createB.Success, createB.Message);
        Assert.True(await service.PayFamilyInvoiceAsync(createB.InvoiceId, "Cash", "pay b"));
    }

    [Fact]
    public async Task CreateAndPayFamilyInvoice_ABSevenInvoicesSingleBatch_ShouldSucceed()
    {
        var context = GetDbContext();
        SeedReferenceData(context);
        SeedParentChildren(context, 10, 101, 102);

        context.TuitionInvoices.AddRange(
            CreateInvoice("a-1", 101, 4, 2026, "Sent", 90),
            CreateInvoice("a-2", 101, 4, 2026, "Sent", 110),
            CreateInvoice("a-3", 101, 4, 2026, "Overdue", 70),
            CreateInvoice("b-1", 102, 4, 2026, "Sent", 100),
            CreateInvoice("b-2", 102, 4, 2026, "Overdue", 130),
            CreateInvoice("b-3", 102, 4, 2026, "Sent", 80),
            CreateInvoice("b-4", 102, 4, 2026, "Sent", 60));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var result = await service.CreateFamilyInvoiceAsync("10", new CreateFamilyInvoiceRequest
        {
            Type = "Family",
            Month = 4,
            Year = 2026,
            SelectedTuitionInvoiceIds = new List<string> { "a-1", "a-2", "a-3", "b-1", "b-2", "b-3", "b-4" }
        });

        Assert.True(result.Success, result.Message);
        Assert.Equal(2, result.StudentCount);

        var familyInvoice = await context.FamilyInvoices
            .Include(fi => fi.StudentInvoices)
            .FirstAsync(fi => fi.InvoiceId == result.InvoiceId);

        Assert.Equal(7, familyInvoice.StudentInvoices.Count);
        Assert.True(await service.PayFamilyInvoiceAsync(result.InvoiceId, "Cash", "pay ab"));
    }

    [Fact]
    public async Task CreateFamilyInvoice_ShouldAllowMultipleBatchesSameMonthYearType_WhenNoOverlap()
    {
        var context = GetDbContext();
        SeedReferenceData(context);
        SeedParentChildren(context, 10, 101);

        context.TuitionInvoices.AddRange(
            CreateInvoice("inv-a", 101, 4, 2026, "Sent", 100),
            CreateInvoice("inv-b", 101, 4, 2026, "Overdue", 120),
            CreateInvoice("inv-c", 101, 4, 2026, "Sent", 80));
        await context.SaveChangesAsync();

        Assert.True(await context.TuitionInvoices.AnyAsync(i => i.InvoiceId == "inv-a"));

        var service = GetService(context);

        var first = await service.CreateFamilyInvoiceAsync("10", new CreateFamilyInvoiceRequest
        {
            Type = "Student",
            Month = 4,
            Year = 2026,
            SelectedTuitionInvoiceIds = new List<string> { "inv-a" }
        });

        var second = await service.CreateFamilyInvoiceAsync("10", new CreateFamilyInvoiceRequest
        {
            Type = "Student",
            Month = 4,
            Year = 2026,
            SelectedTuitionInvoiceIds = new List<string> { "inv-b", "inv-c" }
        });

        Assert.True(first.Success, first.Message);
        Assert.True(second.Success, second.Message);
        Assert.NotEqual(first.InvoiceId, second.InvoiceId);
        Assert.Equal(2, await context.FamilyInvoices.CountAsync());
    }

    [Fact]
    public async Task CreateFamilyInvoice_ShouldReject_WhenInvoiceNotOwnedByParent()
    {
        var context = GetDbContext();
        SeedReferenceData(context);
        SeedParentChildren(context, 10, 101);

        context.TuitionInvoices.Add(CreateInvoice("inv-a", 202, 4, 2026, "Sent", 100));
        await context.SaveChangesAsync();

        var service = GetService(context);

        var result = await service.CreateFamilyInvoiceAsync("10", new CreateFamilyInvoiceRequest
        {
            Type = "Family",
            Month = 4,
            Year = 2026,
            SelectedTuitionInvoiceIds = new List<string> { "inv-a" }
        });

        Assert.False(result.Success);
        Assert.Contains("không thuộc", result.Message ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        Assert.Empty(context.FamilyInvoices);
    }

    [Fact]
    public async Task CreateFamilyInvoice_ShouldReject_WhenSelectedInvoiceAlreadyInPendingFamilyInvoice()
    {
        var context = GetDbContext();
        SeedReferenceData(context);
        SeedParentChildren(context, 10, 101);

        context.TuitionInvoices.Add(CreateInvoice("inv-a", 101, 4, 2026, "Sent", 100));
        context.FamilyInvoices.Add(new FamilyInvoice
        {
            InvoiceId = "fi-1",
            ParentId = "10",
            Type = "Family",
            Month = 4,
            Year = 2026,
            TotalAmount = 100,
            StudentCount = 1,
            Status = "Pending",
            StudentInvoices = new List<FamilyInvoiceItem>
            {
                new FamilyInvoiceItem
                {
                    ItemId = "fii-1",
                    FamilyInvoiceId = "fi-1",
                    StudentInvoiceId = "inv-a",
                    StudentId = 101,
                    StudentName = "Student 101",
                    Amount = 100,
                    Status = "Pending"
                }
            }
        });
        await context.SaveChangesAsync();

        var service = GetService(context);
        var result = await service.CreateFamilyInvoiceAsync("10", new CreateFamilyInvoiceRequest
        {
            Type = "Family",
            Month = 4,
            Year = 2026,
            SelectedTuitionInvoiceIds = new List<string> { "inv-a" }
        });

        Assert.False(result.Success);
        Assert.Contains("đang chờ", result.Message ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateFamilyInvoice_ShouldRejectStudentType_WhenMultipleStudentsSelected()
    {
        var context = GetDbContext();
        SeedReferenceData(context);
        SeedParentChildren(context, 10, 101, 102);

        context.TuitionInvoices.AddRange(
            CreateInvoice("inv-a", 101, 4, 2026, "Sent", 100),
            CreateInvoice("inv-b", 102, 4, 2026, "Sent", 200));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var result = await service.CreateFamilyInvoiceAsync("10", new CreateFamilyInvoiceRequest
        {
            Type = "Student",
            Month = 4,
            Year = 2026,
            SelectedTuitionInvoiceIds = new List<string> { "inv-a", "inv-b" }
        });

        Assert.False(result.Success);
        Assert.Contains("một học sinh", result.Message ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateFamilyInvoice_ShouldFallbackToLegacyStudentIds_WhenSelectedIdsNotProvided()
    {
        var context = GetDbContext();
        SeedReferenceData(context);
        SeedParentChildren(context, 10, 101);

        context.TuitionInvoices.AddRange(
            CreateInvoice("inv-a", 101, 4, 2026, "Sent", 100),
            CreateInvoice("inv-b", 101, 4, 2026, "Overdue", 50));
        await context.SaveChangesAsync();

        var service = GetService(context);
        var result = await service.CreateFamilyInvoiceAsync("10", new CreateFamilyInvoiceRequest
        {
            Type = "Student",
            Month = 4,
            Year = 2026,
            StudentIds = new List<int> { 101 }
        });

        Assert.True(result.Success, result.Message);
        var invoice = await context.FamilyInvoices.Include(fi => fi.StudentInvoices).FirstAsync();
        Assert.Equal(2, invoice.StudentInvoices.Count);
    }

    private static void SeedParentChildren(EducenV2Context context, int parentId, params int[] studentIds)
    {
        context.Parents.Add(new Parent { UserId = parentId });

        foreach (var studentId in studentIds)
        {
            context.Students.Add(new Student { UserId = studentId });
            context.Set<Dictionary<string, object>>("ParentStudent").Add(new Dictionary<string, object>
            {
                ["ParentsUserId"] = parentId,
                ["StudentsUserId"] = studentId
            });
        }
    }

    private static void SeedReferenceData(EducenV2Context context)
    {
        context.Subjects.Add(new Subject { SubjectId = 1, SubjectName = "Math" });
        context.Classes.Add(new Class { ClassId = 1, SubjectId = 1, ClassName = "Class 1" });
    }

    private static TuitionInvoice CreateInvoice(string invoiceId, int studentId, int month, int year, string status, decimal amount)
    {
        return new TuitionInvoice
        {
            InvoiceId = invoiceId,
            StudentId = studentId,
            ClassId = 1,
            InvoiceMonth = month,
            InvoiceYear = year,
            FinalAmount = amount,
            TotalAmount = amount,
            PricePerSession = 10,
            DueDate = DateTime.UtcNow.AddDays(7),
            Status = status
        };
    }

    private sealed class FakeTuitionService : ITuitionService
    {
        public Task<TuitionCalculationResult> CalculateTuitionAsync(int studentId, int classId, int month, int year) =>
            throw new NotImplementedException();

        public Task<List<TuitionCalculationResult>> CalculateClassTuitionAsync(int classId, int month, int year) =>
            throw new NotImplementedException();

        public Task<List<TuitionInvoice>> GetStudentPaymentHistoryAsync(int studentId) =>
            throw new NotImplementedException();

        public Task<List<TuitionInvoice>> GetOutstandingInvoicesAsync(int studentId) =>
            throw new NotImplementedException();
    }
}
