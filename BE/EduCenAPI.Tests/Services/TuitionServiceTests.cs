using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services;
using EduCenAPI.Tests.Fakes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EduCenAPI.Tests.Services
{
    public class TuitionServiceTests
    {
        private static EducenV2Context GetContext()
        {
            var options = new DbContextOptionsBuilder<EducenV2Context>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new EducenV2Context(options, new FakeTenantService());
        }

        private static TuitionService Svc(EducenV2Context ctx) => new(ctx, NullLogger<TuitionService>.Instance);

        private static Subject Sub(int id = 1) => new() { SubjectId = id, SubjectName = "Math" };
        private static Class Cl(int id, decimal? price, int subId = 1) => new() { ClassId = id, ClassName = "C1", MaxStudents = 30, SubjectId = subId, PricePerSession = price };
        private static Student St(int id) => new() { UserId = id, Email = $"s{id}@t.com" };
        private static User Us(int id) => new() { UserId = id, Username = $"u{id}", AccountStatus = "Active", Email = $"u{id}@t.com", FullName = $"User {id}" };
        private static Schedule Sch(int id, int classId) => new() { ScheduleId = id, ClassId = classId, DayOfWeek = 1, StartTime = TimeOnly.MinValue, EndTime = TimeOnly.MaxValue };
        private static ClassSession Ses(int id, int schId, DateTime date) => new() { SessionId = id, ScheduleId = schId, SessionDate = date, Status = "Completed" };
        private static Attendance Att(int id, int sesId, int stId, string status) => new() { AttendanceId = id, SessionId = sesId, StudentId = stId, Status = status };

        [Fact]
        public async Task CalculateTuition_Throws_WhenClassNotFound()
        {
            var ctx = GetContext();
            var ex = await Assert.ThrowsAsync<Exception>(() => Svc(ctx).CalculateTuitionAsync(1, 99, 4, 2025));
            Assert.Equal("Không tìm thấy lớp học.", ex.Message);
        }

        [Fact]
        public async Task CalculateTuition_Throws_WhenPricePerSessionNotSet()
        {
            var ctx = GetContext();
            ctx.Subjects.Add(Sub());
            ctx.Classes.Add(Cl(1, null));
            await ctx.SaveChangesAsync();

            var ex = await Assert.ThrowsAsync<Exception>(() => Svc(ctx).CalculateTuitionAsync(1, 1, 4, 2025));
            Assert.Equal("Chưa thiết lập đơn giá mỗi buổi học cho lớp này. Vui lòng thiết lập đơn giá trong trang Quản lý học phí.", ex.Message);
        }

        [Fact]
        public async Task CalculateTuition_Throws_WhenPricePerSessionIsZero()
        {
            var ctx = GetContext();
            ctx.Subjects.Add(Sub());
            ctx.Classes.Add(Cl(1, 0));
            await ctx.SaveChangesAsync();

            var ex = await Assert.ThrowsAsync<Exception>(() => Svc(ctx).CalculateTuitionAsync(1, 1, 4, 2025));
            Assert.Equal("Chưa thiết lập đơn giá mỗi buổi học cho lớp này. Vui lòng thiết lập đơn giá trong trang Quản lý học phí.", ex.Message);
        }

        [Fact]
        public async Task CalculateTuition_Throws_WhenStudentNotFound()
        {
            var ctx = GetContext();
            ctx.Subjects.Add(Sub());
            ctx.Classes.Add(Cl(1, 100000));
            await ctx.SaveChangesAsync();

            var ex = await Assert.ThrowsAsync<Exception>(() => Svc(ctx).CalculateTuitionAsync(99, 1, 4, 2025));
            Assert.Equal("Không tìm thấy học sinh.", ex.Message);
        }

        [Fact]
        public async Task CalculateTuition_ReturnsZero_WhenNoSessionsInMonth()
        {
            var ctx = GetContext();
            ctx.Subjects.Add(Sub());
            ctx.Classes.Add(Cl(1, 100000));
            ctx.Users.Add(Us(1));
            ctx.Students.Add(St(1));
            await ctx.SaveChangesAsync();

            var result = await Svc(ctx).CalculateTuitionAsync(1, 1, 4, 2025);

            Assert.Equal(0, result.TotalSessions);
            Assert.Equal(0, result.AttendedSessions);
            Assert.Equal(0, result.AbsentSessions);
            Assert.Equal(0m, result.TotalAmount);
            Assert.Equal("User 1", result.StudentName);
            Assert.Equal("C1", result.ClassName);
        }

        [Fact]
        public async Task CalculateTuition_ReturnsCorrectAmount_WhenAllAttended()
        {
            var ctx = GetContext();
            ctx.Subjects.Add(Sub());
            ctx.Classes.Add(Cl(1, 100000));
            ctx.Users.Add(Us(1));
            ctx.Students.Add(St(1));
            ctx.Schedules.Add(Sch(1, 1));
            ctx.ClassSessions.Add(Ses(1, 1, new DateTime(2025, 4, 5)));
            ctx.ClassSessions.Add(Ses(2, 1, new DateTime(2025, 4, 12)));
            ctx.Attendances.Add(Att(1, 1, 1, "present"));
            ctx.Attendances.Add(Att(2, 2, 1, "Attended"));
            await ctx.SaveChangesAsync();

            var result = await Svc(ctx).CalculateTuitionAsync(1, 1, 4, 2025);

            Assert.Equal(2, result.TotalSessions);
            Assert.Equal(2, result.AttendedSessions);
            Assert.Equal(0, result.AbsentSessions);
            Assert.Equal(200000m, result.TotalAmount);
            Assert.Equal(200000m, result.FinalAmount);
            Assert.Equal(2, result.SessionDetails.Count);
            Assert.All(result.SessionDetails, d => Assert.True(d.Amount > 0));
        }

        [Fact]
        public async Task CalculateTuition_ReturnsCorrectAmount_WhenSomeAbsent()
        {
            var ctx = GetContext();
            ctx.Subjects.Add(Sub());
            ctx.Classes.Add(Cl(1, 100000));
            ctx.Users.Add(Us(1));
            ctx.Students.Add(St(1));
            ctx.Schedules.Add(Sch(1, 1));
            ctx.ClassSessions.Add(Ses(1, 1, new DateTime(2025, 4, 5)));
            ctx.ClassSessions.Add(Ses(2, 1, new DateTime(2025, 4, 12)));
            ctx.ClassSessions.Add(Ses(3, 1, new DateTime(2025, 4, 19)));
            ctx.Attendances.Add(Att(1, 1, 1, "present"));
            ctx.Attendances.Add(Att(2, 2, 1, "absent"));
            await ctx.SaveChangesAsync();

            var result = await Svc(ctx).CalculateTuitionAsync(1, 1, 4, 2025);

            Assert.Equal(3, result.TotalSessions);
            Assert.Equal(1, result.AttendedSessions);
            Assert.Equal(2, result.AbsentSessions);
            Assert.Equal(100000m, result.TotalAmount);
            Assert.Equal(3, result.SessionDetails.Count);
            Assert.Equal(100000m, result.SessionDetails.First(d => d.Status == "present").Amount);
            Assert.Equal(0m, result.SessionDetails.First(d => d.Status == "absent").Amount);
            Assert.Equal(0m, result.SessionDetails.First(d => d.Status == "Absent").Amount);
        }

        [Fact]
        public async Task CalculateTuition_TreatsMissingAttendanceAsAbsent()
        {
            var ctx = GetContext();
            ctx.Subjects.Add(Sub());
            ctx.Classes.Add(Cl(1, 50000));
            ctx.Users.Add(Us(1));
            ctx.Students.Add(St(1));
            ctx.Schedules.Add(Sch(1, 1));
            ctx.ClassSessions.Add(Ses(1, 1, new DateTime(2025, 4, 5)));
            await ctx.SaveChangesAsync();

            var result = await Svc(ctx).CalculateTuitionAsync(1, 1, 4, 2025);

            Assert.Equal(1, result.TotalSessions);
            Assert.Equal(0, result.AttendedSessions);
            Assert.Equal(1, result.AbsentSessions);
            Assert.Equal(0m, result.TotalAmount);
            Assert.Single(result.SessionDetails);
            Assert.Equal("Absent", result.SessionDetails[0].Status);
            Assert.Equal(0m, result.SessionDetails[0].Amount);
        }
    }
}
