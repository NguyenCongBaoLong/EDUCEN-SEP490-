using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace EducenAPI.Services.Interface
{
    public interface IStudentImportService
    {
        Task<object> ImportStudentsAsync(IFormFile file);
    }
}

