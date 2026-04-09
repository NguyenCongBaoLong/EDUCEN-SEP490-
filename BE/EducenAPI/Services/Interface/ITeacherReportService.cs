using EduCen.DTOs.TeacherDashboard;
using EducenAPI.DTOs.CenterDashboard;

namespace EducenAPI.Services.Interface
{
    public interface ITeacherReportService
    {
        Task<TeacherPerformanceResponse> GetReportByClassAsync(int classId);
        Task<TeacherPerformanceResponse> GetTeacherOverallReportAsync(int teacherUserId);

    }
}
