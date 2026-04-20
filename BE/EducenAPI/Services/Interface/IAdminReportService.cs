using EducenAPI.DTOs.Admin;
using System.Threading.Tasks;

namespace EducenAPI.Services.Interface
{
    public interface IAdminReportService
    {
        Task<TeacherStatisticsResponse> GetTeacherTeachingStatsAsync(int month, int year);
        Task<byte[]> ExportTeacherTeachingStatsToCsvAsync(int month, int year);
    }
}
