using EduCenAPI.Tests.Fakes;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
using EducenAPI.Ultils;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

public class EnrollmentRequestService_CreateRequest_Tests
{
    private EducenV2Context GetDbContext()
    {
        var options = new DbContextOptionsBuilder<EducenV2Context>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new EducenV2Context(options, new FakeTenantService());
    }

    private MailService GetMailService()
    {
        var configData = new Dictionary<string, string?>
        {
            ["EmailSettings:Email"] = "test@example.com",
            ["EmailSettings:Password"] = "test123",
            ["EmailSettings:Host"] = "smtp.example.com",
            ["EmailSettings:Port"] = "587"
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();

        return new MailService(configuration, new FakeTenantService());
    }

    private EnrollmentRequestService GetService(EducenV2Context context)
        => new(context, GetMailService(), NullLogger<EnrollmentRequestService>.Instance);

    private static EnrollmentRequest CreateValidRequest() =>
        new()
        {
            FirstName = "An",
            LastName = "Nguyen",
            Email = "an@example.com",
            Phone = "0912345678",
            PreferredCourse = "Math",
            Address = "123 Main Street",
            RequestType = "GuestRegistration"
        };

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateRequest_ShouldThrow_WhenEmailIsRequired(string? email)
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var request = CreateValidRequest();
        request.Email = email!;

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateRequestAsync(request));

        Assert.Equal("Email là bắt buộc.", ex.Message);
    }

    [Theory]
    [InlineData(null, "Nguyen")]
    [InlineData("An", null)]
    [InlineData("   ", "Nguyen")]
    [InlineData("An", "   ")]
    public async Task CreateRequest_ShouldThrow_WhenFirstNameOrLastNameIsRequired(string? firstName, string? lastName)
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var request = CreateValidRequest();
        request.FirstName = firstName!;
        request.LastName = lastName!;

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateRequestAsync(request));

        Assert.Equal("Họ và tên là bắt buộc.", ex.Message);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateRequest_ShouldThrow_WhenPhoneIsRequired(string? phone)
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var request = CreateValidRequest();
        request.Phone = phone!;

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateRequestAsync(request));

        Assert.Equal("Số điện thoại là bắt buộc.", ex.Message);
    }

    [Theory]
    [InlineData("12345")]
    [InlineData("841234567")]
    [InlineData("912345678")]
    public async Task CreateRequest_ShouldThrow_WhenPhoneIsInvalidAfterNormalization(string phone)
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var request = CreateValidRequest();
        request.Phone = phone;

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateRequestAsync(request));

        Assert.Equal("Số điện thoại không hợp lệ! Vui lòng nhập SĐT Việt Nam (10 số).", ex.Message);
    }

    [Fact]
    public async Task CreateRequest_ShouldThrow_WhenEmailFormatIsInvalid()
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var request = CreateValidRequest();
        request.Email = "invalid-email";

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateRequestAsync(request));

        Assert.Equal("Định dạng Email không hợp lệ.", ex.Message);
    }

    [Fact]
    public async Task CreateRequest_ShouldThrow_WhenParentEmailFormatIsInvalid()
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var request = CreateValidRequest();
        request.ParentEmail = "invalid-parent-email";

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateRequestAsync(request));

        Assert.Equal("Định dạng Email phụ huynh không hợp lệ.", ex.Message);
    }

    [Fact]
    public async Task CreateRequest_ShouldThrow_WhenDuplicatePendingRequestExistsByEmail()
    {
        using var context = GetDbContext();
        context.EnrollmentRequests.Add(new EnrollmentRequest
        {
            FirstName = "Existing",
            LastName = "User",
            Email = "an@example.com",
            Phone = "0900000000",
            Status = "Pending",
            RequestType = "GuestRegistration"
        });
        await context.SaveChangesAsync();

        var service = GetService(context);

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateRequestAsync(CreateValidRequest()));

        Assert.Equal("Đã tồn tại yêu cầu đăng ký đang chờ duyệt với email này.", ex.Message);
    }

    [Fact]
    public async Task CreateRequest_ShouldThrow_WhenDuplicatePendingRequestExistsByPhone()
    {
        using var context = GetDbContext();
        context.EnrollmentRequests.Add(new EnrollmentRequest
        {
            FirstName = "Existing",
            LastName = "User",
            Email = "other@example.com",
            Phone = "0912345678",
            Status = "Pending",
            RequestType = "GuestRegistration"
        });
        await context.SaveChangesAsync();

        var service = GetService(context);

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateRequestAsync(CreateValidRequest()));

        Assert.Equal("Đã tồn tại yêu cầu đăng ký đang chờ duyệt với số điện thoại này.", ex.Message);
    }

    [Fact]
    public async Task CreateRequest_ShouldThrow_WhenGuestRegistrationEmailAlreadyExistsInUsers()
    {
        using var context = GetDbContext();
        context.Users.Add(new User
        {
            Username = "existing",
            PasswordHash = "hashed",
            AccountStatus = "Active",
            RoleId = 3,
            FullName = "Existing User",
            Email = "an@example.com",
            PhoneNumber = "0900000000"
        });
        await context.SaveChangesAsync();

        var service = GetService(context);

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateRequestAsync(CreateValidRequest()));

        Assert.Equal("Email này đã được sử dụng bởi một tài khoản khác trong hệ thống!", ex.Message);
    }

    [Fact]
    public async Task CreateRequest_ShouldThrow_WhenGuestRegistrationPhoneAlreadyExistsForStudent()
    {
        using var context = GetDbContext();
        context.Users.Add(new User
        {
            Username = "student-user",
            PasswordHash = "hashed",
            AccountStatus = "Active",
            RoleId = 3,
            FullName = "Existing Student",
            Email = "student@example.com",
            PhoneNumber = "0912345678"
        });
        await context.SaveChangesAsync();

        var service = GetService(context);

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateRequestAsync(CreateValidRequest()));

        Assert.Equal("Số điện thoại này đã được đăng ký bởi một học sinh khác! Vui lòng kiểm tra lại hoặc đăng nhập.", ex.Message);
    }

    [Fact]
    public async Task CreateRequest_ShouldSetClassIdAndGradeIdToNull_WhenValuesAreNonPositive()
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var request = CreateValidRequest();
        request.ClassId = 0;
        request.GradeId = -1;

        var result = await service.CreateRequestAsync(request);

        Assert.Null(result.ClassId);
        Assert.Null(result.GradeId);
        Assert.Equal("Pending", result.Status);
        Assert.Single(context.EnrollmentRequests);
    }

    [Fact]
    public async Task CreateRequest_ShouldThrow_WhenSelectedClassIsFull()
    {
        using var context = GetDbContext();
        context.Classes.Add(new Class
        {
            ClassId = 10,
            SubjectId = 1,
            ClassName = "Math 101",
            Status = "Active",
            MaxStudents = 1,
            Students = new List<Student>
            {
                new() { UserId = 100, EnrollmentStatus = "Active" }
            }
        });
        await context.SaveChangesAsync();

        var service = GetService(context);
        var request = CreateValidRequest();
        request.ClassId = 10;

        var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateRequestAsync(request));

        Assert.Equal("Rất tiếc, lớp học này đã đủ sĩ số tối đa. Vui lòng chọn lớp khác hoặc liên hệ trung tâm để được tư vấn.", ex.Message);
    }

    [Fact]
    public async Task CreateRequest_ShouldNormalizeParentPhone_WhenProvided()
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var request = CreateValidRequest();
        request.ParentPhone = "+84 912-345-679";

        var result = await service.CreateRequestAsync(request);

        Assert.Equal("0912345679", result.ParentPhone);
    }

    [Fact]
    public async Task CreateRequest_ShouldNormalizePhoneFromCountryCode()
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var request = CreateValidRequest();
        request.Phone = "+84 912 345 678";

        var result = await service.CreateRequestAsync(request);

        Assert.Equal("0912345678", result.Phone);
    }

    [Fact]
    public async Task CreateRequest_ShouldNormalizePhoneWithSeparators()
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var request = CreateValidRequest();
        request.Phone = "0912 345-678";

        var result = await service.CreateRequestAsync(request);

        Assert.Equal("0912345678", result.Phone);
    }

    [Fact]
    public async Task CreateRequest_ShouldTrimMainFieldsBeforeSaving()
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var request = CreateValidRequest();
        request.Email = "  an@example.com  ";
        request.FirstName = "  An  ";
        request.LastName = "  Nguyen  ";
        request.Phone = " 0912345678 ";

        var result = await service.CreateRequestAsync(request);

        Assert.Equal("an@example.com", result.Email);
        Assert.Equal("An", result.FirstName);
        Assert.Equal("Nguyen", result.LastName);
        Assert.Equal("0912345678", result.Phone);
    }

    [Fact]
    public async Task CreateRequest_ShouldCreatePendingRequest_WhenNormalRequestIsValid()
    {
        using var context = GetDbContext();
        var service = GetService(context);
        var request = CreateValidRequest();
        request.RequestType = "ExistingStudentEnrollment";

        var before = DateTime.UtcNow;
        var result = await service.CreateRequestAsync(request);
        var after = DateTime.UtcNow;

        Assert.Equal("Pending", result.Status);
        Assert.InRange(result.RequestDate, before.AddSeconds(-1), after.AddSeconds(1));
        Assert.Single(context.EnrollmentRequests);
    }

    [Fact]
    public async Task CreateRequest_ShouldCreatePendingRequest_WhenGuestRegistrationIsValid()
    {
        using var context = GetDbContext();
        var service = GetService(context);

        var result = await service.CreateRequestAsync(CreateValidRequest());

        Assert.Equal("GuestRegistration", result.RequestType);
        Assert.Equal("Pending", result.Status);
        Assert.Single(context.EnrollmentRequests);
    }
}
