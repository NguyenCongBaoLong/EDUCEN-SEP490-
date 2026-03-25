using EducenAPI.DTOs.CenterHome;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace EducenAPI.Services
{
    public class CenterHomeService : ICenterHomeService
    {
        private readonly EducenV2Context _context;
        private readonly IFileUploadService _fileService; // Inject FileUploadService

        public CenterHomeService(EducenV2Context context, IFileUploadService fileService)
        {
            _context = context;
            _fileService = fileService;
        }

        public async Task<CenterHomeResponseDto?> GetCenterHomeAsync(string tenantId, string baseUrl)
        {
            // 1. Query dữ liệu và ÉP BUỘC bỏ qua Filter (để khách vãng lai cũng xem được)
            var profile = await _context.CenterProfiles
                .IgnoreQueryFilters() // <--- Rất quan trọng cho trang Public
                .Include(p => p.HeroImages)
                .Include(p => p.Images)
                .Include(p => p.Highlights)
                .FirstOrDefaultAsync(p => p.TenantId == tenantId);

            if (profile == null)
            {
                return null; // Controller sẽ check null để trả về 404
            }

            // --- Hàm hỗ trợ format URL ảnh giống hệt bên Assignment ---
            string FormatImageUrl(string? url)
            {
                if (string.IsNullOrEmpty(url)) return string.Empty;
                if (url.StartsWith("http")) return url; // Nếu là link mạng ngoài thì giữ nguyên
                return $"{baseUrl}/{url.Replace("\\", "/").Replace("wwwroot/", "").TrimStart('/')}";
            }

            // 2. Map dữ liệu ra DTO
            var response = new CenterHomeResponseDto
            {
                Name = profile.Name,
                Logo = FormatImageUrl(profile.LogoUrl),
                Tagline = profile.Tagline,
                FooterTagline = profile.FooterTagline,
                Address = profile.Address,
                City = profile.City,
                Phone = profile.Phone,
                Email = profile.Email,
                Website = profile.Website,
                IntroTitle = profile.IntroTitle,
                IntroDescription = profile.IntroDescription,
                QuoteText = profile.QuoteText,
                Copyright = profile.Copyright,

                // Xử lý danh sách ảnh: Sắp xếp theo SortOrder và Format URL
                HeroImages = profile.HeroImages != null
                    ? profile.HeroImages.OrderBy(h => h.SortOrder).Select(h => FormatImageUrl(h.ImageUrl)).ToList()
                    : new List<string>(),

                Images = profile.Images != null
                    ? profile.Images.OrderBy(i => i.SortOrder).Select(i => FormatImageUrl(i.ImageUrl)).ToList()
                    : new List<string>(),

                Highlights = profile.Highlights != null
                    ? profile.Highlights.OrderBy(h => h.SortOrder).Select(h => new HighlightDto
                    {
                        Icon = h.Icon,
                        Text = h.Text
                    }).ToList()
                    : new List<HighlightDto>()
            };

            return response;
        }

        public async Task<bool> SaveCenterHomeAsync(string tenantId, SaveCenterHomeDto dto)
        {
            // Thêm IgnoreQueryFilters() để bỏ qua cơ chế giấu dữ liệu tự động
            var profile = await _context.CenterProfiles
                .IgnoreQueryFilters() // <--- THÊM DÒNG NÀY VÀO ĐÂY
                .Include(p => p.HeroImages)
                .Include(p => p.Images)
                .Include(p => p.Highlights)
                .FirstOrDefaultAsync(p => p.TenantId == tenantId);

            bool isCreateNew = false;
            //  Nếu chưa có (Lần đầu tiên lưu) -> Khởi tạo mới
            if (profile == null)
            {
                profile = new CenterProfile
                {
                    TenantId = tenantId,
                    // BẮT ĐẦU THÊM MỚI 3 DÒNG NÀY ĐỂ KHỞI TẠO DANH SÁCH:
                    HeroImages = new List<CenterHeroImage>(),
                    Images = new List<CenterImage>(),
                    Highlights = new List<CenterHighlight>()
                    // KẾT THÚC THÊM MỚI
                };
                _context.CenterProfiles.Add(profile);
                isCreateNew = true;
            }

            // --- 1. XỬ LÝ UPLOAD LOGO ---
            string finalLogoUrl = dto.ExistingLogoUrl ?? profile.LogoUrl;
            if (dto.LogoFile != null)
            {
                var files = new FormFileCollection { dto.LogoFile };
                var uploadedFiles = await _fileService.UploadResourceFile(files);
                if (uploadedFiles.Any()) finalLogoUrl = uploadedFiles.First().FilePath;
            }

            // Cập nhật text & Logo
            profile.TenantId = tenantId;
            profile.Name = dto.Name;
            profile.LogoUrl = finalLogoUrl;
            profile.Tagline = dto.Tagline;
            profile.FooterTagline = dto.FooterTagline;
            profile.Address = dto.Address;
            profile.City = dto.City;
            profile.Phone = dto.Phone;
            profile.Email = dto.Email;
            profile.Website = dto.Website;
            profile.IntroTitle = dto.IntroTitle;
            profile.IntroDescription = dto.IntroDescription;
            profile.QuoteText = dto.QuoteText;
            profile.Copyright = dto.Copyright;

            if (!isCreateNew)
            {
                _context.CenterHeroImages.RemoveRange(profile.HeroImages);
                _context.CenterImages.RemoveRange(profile.Images);
                _context.CenterHighlights.RemoveRange(profile.Highlights);
            }

            // --- 2. XỬ LÝ HERO IMAGES ---
            var allHeroUrls = new List<string>();
            if (dto.ExistingHeroImageUrls != null) allHeroUrls.AddRange(dto.ExistingHeroImageUrls);

            if (dto.HeroImageFiles != null && dto.HeroImageFiles.Count > 0)
            {
                var heroCollection = new FormFileCollection();
                foreach (var file in dto.HeroImageFiles) heroCollection.Add(file);
                var heroUploads = await _fileService.UploadResourceFile(heroCollection);
                allHeroUrls.AddRange(heroUploads.Select(x => x.FilePath));
            }

            for (int i = 0; i < allHeroUrls.Count; i++)
            {
                profile.HeroImages.Add(new CenterHeroImage
                {
                    TenantId = tenantId,
                    ImageUrl = allHeroUrls[i],
                    SortOrder = i
                });
            }

            // --- 3. XỬ LÝ CENTER IMAGES ---
            var allImageUrls = new List<string>();
            if (dto.ExistingImageUrls != null) allImageUrls.AddRange(dto.ExistingImageUrls);

            if (dto.ImageFiles != null && dto.ImageFiles.Count > 0)
            {
                var imgCollection = new FormFileCollection();
                foreach (var file in dto.ImageFiles) imgCollection.Add(file);
                var imgUploads = await _fileService.UploadResourceFile(imgCollection);
                allImageUrls.AddRange(imgUploads.Select(x => x.FilePath));
            }

            for (int i = 0; i < allImageUrls.Count; i++)
            {
                profile.Images.Add(new CenterImage // Chú ý: Entity của bạn tên là CenterImages
                {
                    TenantId = tenantId,
                    ImageUrl = allImageUrls[i],
                    SortOrder = i
                });
            }

            // --- 4. XỬ LÝ HIGHLIGHTS ---
            if (dto.Highlights != null)
            {
                for (int i = 0; i < dto.Highlights.Count; i++)
                {
                    profile.Highlights.Add(new CenterHighlight
                    {
                        TenantId = tenantId,
                        Icon = dto.Highlights[i].Icon,
                        Text = dto.Highlights[i].Text,
                        SortOrder = i
                    });
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }
    }
}