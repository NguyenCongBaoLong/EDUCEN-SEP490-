using System.Threading.Tasks;
using EducenAPI.DTOs.CenterHome;

namespace EducenAPI.Services.Interface
{
    public interface ICenterHomeService
    {
        Task<CenterHomeResponseDto?> SaveCenterHomeAsync(SaveCenterHomeDto dto, string baseUrl);
        Task<CenterHomeResponseDto?> GetCenterHomeAsync(string baseUrl);
        Task<IEnumerable<HomeClassDto>> GetUpcomingClassesAsync();
    }
}
