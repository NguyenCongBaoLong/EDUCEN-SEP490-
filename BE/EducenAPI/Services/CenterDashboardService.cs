using EducenAPI.DTOs.CenterDashboard;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class CenterDashboardService : ICenterDashboardService
    {
        private readonly EducenV2Context _db;
        private readonly AdminDbContext _adminDb;
        private readonly ICurrentTenantService _tenantService;

        public CenterDashboardService(
            EducenV2Context db,
            AdminDbContext adminDb,
            ICurrentTenantService tenantService)
        {
            _db = db;
            _adminDb = adminDb;
            _tenantService = tenantService;
        }

        public async Task<CenterDashboardResponse> GetDashboardAsync()
        {
            var overview = await GetOverview();

            var chart = await GetStudentRegistrationChart();

            var subject = await GetSubjectDistribution();

            return new CenterDashboardResponse
            {
                Overview = overview,
                StudentRegistrationChart = chart,
                StudentsBySubject = subject
            };
        }

        // ==============================
        // OVERVIEW
        // ==============================

        private async Task<OverviewDto> GetOverview()
        {
            var now = DateTime.UtcNow;

            var totalStudents = await _db.Students.CountAsync();

            var totalClasses = await _db.Classes
                .CountAsync(c => c.Status == "Active");

            var upcomingClasses = await _db.Classes
                .CountAsync(c => c.Status == "Upcoming");

            var totalStaff = await _db.Users
                .CountAsync(u =>
                     u.RoleId == 2 ||  // Teacher
                     u.RoleId == 5);   // Assistant

            var activeStaff = await _db.Users
                .CountAsync(u => u.AccountStatus == "Active");

            var startOfMonth = new DateTime(now.Year, now.Month, 1);
            var endOfMonth = startOfMonth.AddMonths(1);

            var newStudentsThisMonth = await _db.Users
                .Where(u => u.Student != null &&
                            u.CreatedAt >= startOfMonth &&
                            u.CreatedAt < endOfMonth)
                .CountAsync();

            // Current usage
            var currentUsers = await _db.Users.CountAsync();

            long totalKB = 0;
            try
            {
                totalKB = await _db.ResourceFiles
                    .Where(rf => rf.FileSize.HasValue)
                    .SumAsync(rf => rf.FileSize ?? 0);
            }
            catch
            {
                // ResourceFile table may not exist yet
            }
            var currentStorageMB = Math.Round(totalKB / 1024.0, 2);

            // Plan limits from Admin DB
            int maxUsers = 0;
            double maxStorageMB = 0;
            try
            {
                var tenantId = _tenantService.TenantId;
                if (!string.IsNullOrEmpty(tenantId))
                {
                    var subscription = await _adminDb.Subscriptions
                        .Include(s => s.Plan)
                        .Where(s => s.TenantId == tenantId
                                 && s.Status == "Active"
                                 && s.EndDate > now)
                        .OrderByDescending(s => s.EndDate)
                        .FirstOrDefaultAsync();

                    if (subscription?.Plan != null)
                    {
                        maxUsers = subscription.Plan.LimitUsers;
                        maxStorageMB = subscription.Plan.StorageLimit * 1024.0; // GB → MB
                    }
                }
            }
            catch
            {
                // Admin DB may not be available
            }

            return new OverviewDto
            {
                TotalStudents = totalStudents,
                TotalClasses = totalClasses,
                UpcomingClasses = upcomingClasses,
                TotalStaff = totalStaff,
                ActiveStaff = activeStaff,
                NewStudentsThisMonth = newStudentsThisMonth,
                CurrentUsers = currentUsers,
                MaxUsers = maxUsers,
                CurrentStorageMB = currentStorageMB,
                MaxStorageMB = maxStorageMB
            };
        }

        // ==============================
        // STUDENT REGISTRATION CHART
        // ==============================

        private async Task<List<StudentRegistrationDto>> GetStudentRegistrationChart()
        {
            var now = DateTime.UtcNow;
            var startDate = now.AddMonths(-6);

            var data = await _db.Students
                .Where(s => s.StudentNavigation.CreatedAt >= startDate)
                .GroupBy(s => new
                {
                    s.StudentNavigation.CreatedAt.Year,
                    s.StudentNavigation.CreatedAt.Month
                })
                .Select(g => new StudentRegistrationDto
                {
                    Month = g.Key.Month,
                    Students = g.Count()
                })
                .OrderBy(x => x.Month)
                .ToListAsync();

            return data;
        }

        // ==============================
        // STUDENTS BY SUBJECT
        // ==============================

        private async Task<List<SubjectDistributionDto>> GetSubjectDistribution()
        {
            var data = await _db.Classes
                .Include(c => c.Subject)
                .SelectMany(c => c.Students,
                    (c, s) => new
                    {
                        SubjectName = c.Subject.SubjectName
                    })
                .GroupBy(x => x.SubjectName)
                .Select(g => new
                {
                    Subject = g.Key,
                    Total = g.Count()
                })
                .ToListAsync();

            var totalStudents = data.Sum(x => x.Total);

            return data.Select(x => new SubjectDistributionDto
            {
                Subject = x.Subject,
                TotalStudents = x.Total,
                Percentage = totalStudents == 0
                    ? 0
                    : Math.Round((double)x.Total / totalStudents * 100, 2)
            }).ToList();
        }

        // ==============================
        // TODO: SEND ZALO NOTIFICATION
        // ==============================

        /*
        public async Task SendNotificationAsync(...)
        {
            // TODO:
            // - Save notification
            // - Send to Zalo OA
        }
        */
    }
}