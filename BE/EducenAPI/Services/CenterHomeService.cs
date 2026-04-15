using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
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

        public async Task<CenterHomeResponseDto?> GetCenterHomeAsync(string baseUrl)
        {
            var profile = await _context.CenterProfiles
                .Include(p => p.HeroImages)
                .Include(p => p.Images)
                .Include(p => p.Highlights)
                .Include(p => p.Staffs)
                .FirstOrDefaultAsync();

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
                    ? profile.HeroImages.OrderBy(h => h.SortOrder).Select(h => new HeroImageDto
                    {
                        ImageUrl = FormatImageUrl(h.ImageUrl),
                        Title = h.Title,
                        SubTitle = h.SubTitle,
                        ButtonText = h.ButtonText,
                        ButtonLink = h.ButtonLink
                    }).ToList()
                    : new List<HeroImageDto>(),

                Images = profile.Images != null
                    ? profile.Images.OrderBy(i => i.SortOrder).Select(i => FormatImageUrl(i.ImageUrl)).ToList()
                    : new List<string>(),

                Highlights = profile.Highlights != null
                    ? profile.Highlights.OrderBy(h => h.SortOrder).Select(h => new HighlightDto
                    {
                        Icon = h.Icon,
                        Text = h.Text
                    }).ToList()
                    : new List<HighlightDto>(),

                PrimaryColor = profile.PrimaryColor,
                BackgroundColor = profile.BackgroundColor,
                FacebookUrl = profile.FacebookUrl,
                InstagramUrl = profile.InstagramUrl,
                YoutubeUrl = profile.YoutubeUrl,
                DisplayConfig = profile.DisplayConfig,

                Staffs = profile.Staffs != null
                    ? profile.Staffs.OrderBy(s => s.SortOrder).Select(s => new StaffDto
                    {
                        Id = s.CenterStaffId,
                        Name = s.Name,
                        Role = s.Role,
                        Bio = s.Bio,
                        AvatarUrl = FormatImageUrl(s.AvatarUrl)
                    }).ToList()
                    : new List<StaffDto>()
            };

            return response;
        }

        public async Task<IEnumerable<HomeClassDto>> GetUpcomingClassesAsync()
        {
            var now = DateTime.Now;
            var classes = await _context.Classes
                .Include(c => c.Subject)
                .Include(c => c.Teacher)
                    .ThenInclude(t => t!.TeacherNavigation)
                .Include(c => c.Schedules)
                .Include(c => c.Students)
                .Include(c => c.Grade)
                .Where(c => c.Status != "Completed" && c.Status != "Cancelled")
                .Where(c => c.EndDate >= now)
                .OrderBy(c => c.StartDate)
                .ToListAsync();

            return classes.Select(c => new HomeClassDto
            {
                ClassId = c.ClassId,
                ClassName = c.ClassName ?? "",
                SubjectName = c.Subject?.SubjectName,
                TeacherName = c.Teacher?.TeacherNavigation?.FullName,
                StartDate = c.StartDate,
                Status = c.Status,
                StudentCount = c.Students.Count,
                GradeId = c.GradeId,
                GradeName = c.Grade != null ? c.Grade.GradeName : null,
                MaxStudents = c.MaxStudents,
                PricePerSession = c.PricePerSession,
                ScheduleSummary = FormatScheduleSummary(c.Schedules)
            });
        }

        private string FormatScheduleSummary(ICollection<Schedule> schedules)
        {
            if (schedules == null || !schedules.Any()) return "Chưa cập nhật";

            var dayNames = new[] { "Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7" };
            
            var groupedSchedules = schedules
                .GroupBy(s => new { s.StartTime, s.EndTime })
                .Select(g => {
                    var days = string.Join(", ", g.OrderBy(s => s.DayOfWeek).Select(s => dayNames[s.DayOfWeek]));
                    return $"{days} ({g.Key.StartTime:HH:mm} - {g.Key.EndTime:HH:mm})";
                });

            return string.Join("; ", groupedSchedules);
        }

        private string StripBaseUrl(string? url, string baseUrl)
        {
            if (string.IsNullOrEmpty(url)) return "";
            if (url.StartsWith(baseUrl))
            {
                return url.Substring(baseUrl.Length).TrimStart('/');
            }
            return url;
        }

        public async Task<CenterHomeResponseDto?> SaveCenterHomeAsync(SaveCenterHomeDto dto, string baseUrl)
        {
            var profile = await _context.CenterProfiles
                .Include(p => p.HeroImages)
                .Include(p => p.Images)
                .Include(p => p.Highlights)
                .Include(p => p.Staffs)
                .FirstOrDefaultAsync();

            bool isCreateNew = false;
            if (profile == null)
            {
                profile = new CenterProfile
                {
                    HeroImages = new List<CenterHeroImage>(),
                    Images = new List<CenterImage>(),
                    Highlights = new List<CenterHighlight>(),
                    Staffs = new List<CenterStaff>()
                };
                _context.CenterProfiles.Add(profile);
                isCreateNew = true;
            }

            // --- 1. LOGO & BRANDING ---
            string finalLogoUrl = StripBaseUrl(dto.ExistingLogoUrl, baseUrl);
            if (string.IsNullOrEmpty(finalLogoUrl)) finalLogoUrl = profile.LogoUrl;

            if (dto.LogoFile != null)
            {
                var col = new FormFileCollection();
                col.Add(dto.LogoFile);
                var uploaded = await _fileService.UploadResourceFile(col);
                if (uploaded.Any()) finalLogoUrl = uploaded.First().FilePath;
            }

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
            
            // Branding & Layout
            profile.PrimaryColor = dto.PrimaryColor;
            profile.BackgroundColor = dto.BackgroundColor;
            profile.FacebookUrl = dto.FacebookUrl;
            profile.InstagramUrl = dto.InstagramUrl;
            profile.YoutubeUrl = dto.YoutubeUrl;
            profile.DisplayConfig = dto.DisplayConfig;

            // --- 2. CLEAR EXISTING RELATIONS (Except those we want to keep/track) ---
            // For simplicity in this CMS, we replace lists
            if (!isCreateNew)
            {
                _context.CenterHeroImages.RemoveRange(profile.HeroImages);
                _context.CenterImages.RemoveRange(profile.Images);
                _context.CenterHighlights.RemoveRange(profile.Highlights);
                _context.CenterStaffs.RemoveRange(profile.Staffs);
            }

            // --- 3. HERO IMAGES (SLIDES) ---
            if (dto.HeroImages != null)
            {
                // Upload files first
                var heroUploads = new List<string>();
                if (dto.HeroImageFiles != null && dto.HeroImageFiles.Count > 0)
                {
                    var col = new FormFileCollection();
                    foreach (var f in dto.HeroImageFiles) col.Add(f);
                    var results = await _fileService.UploadResourceFile(col);
                    heroUploads = results.Select(r => r.FilePath).ToList();
                }

                for (int i = 0; i < dto.HeroImages.Count; i++)
                {
                    var hDto = dto.HeroImages[i];
                    string imgUrl = StripBaseUrl(hDto.ExistingImageUrl, baseUrl);
                    if (hDto.FileIndex.HasValue && hDto.FileIndex < heroUploads.Count)
                    {
                        imgUrl = heroUploads[hDto.FileIndex.Value];
                    }

                    if (!string.IsNullOrEmpty(imgUrl))
                    {
                        profile.HeroImages.Add(new CenterHeroImage
                        {
                            ImageUrl = imgUrl,
                            Title = hDto.Title,
                            SubTitle = hDto.SubTitle,
                            ButtonText = hDto.ButtonText,
                            ButtonLink = hDto.ButtonLink,
                            SortOrder = i
                        });
                    }
                }
            }

            // --- 4. CENTER IMAGES (GALLERY) ---
            var allImageUrls = new List<string>();
            if (dto.ExistingImageUrls != null) 
            {
                allImageUrls.AddRange(dto.ExistingImageUrls.Select(u => StripBaseUrl(u, baseUrl)));
            }
            if (dto.ImageFiles != null && dto.ImageFiles.Count > 0)
            {
                var col = new FormFileCollection();
                foreach (var f in dto.ImageFiles) col.Add(f);
                var uploads = await _fileService.UploadResourceFile(col);
                allImageUrls.AddRange(uploads.Select(x => x.FilePath));
            }
            for (int i = 0; i < allImageUrls.Count; i++)
            {
                profile.Images.Add(new CenterImage { ImageUrl = allImageUrls[i], SortOrder = i });
            }

            // --- 5. HIGHLIGHTS ---
            if (dto.Highlights != null)
            {
                for (int i = 0; i < dto.Highlights.Count; i++)
                {
                    profile.Highlights.Add(new CenterHighlight
                    {
                        Icon = dto.Highlights[i].Icon,
                        Text = dto.Highlights[i].Text,
                        SortOrder = i
                    });
                }
            }

            // --- 6. STAFF (TEACHERS) ---
            if (dto.Staffs != null)
            {
                var staffUploads = new List<string>();
                if (dto.StaffAvatarFiles != null && dto.StaffAvatarFiles.Count > 0)
                {
                    var col = new FormFileCollection();
                    foreach (var f in dto.StaffAvatarFiles) col.Add(f);
                    var results = await _fileService.UploadResourceFile(col);
                    staffUploads = results.Select(r => r.FilePath).ToList();
                }

                for (int i = 0; i < dto.Staffs.Count; i++)
                {
                    var sDto = dto.Staffs[i];
                    string avatarUrl = StripBaseUrl(sDto.ExistingAvatarUrl, baseUrl);
                    if (sDto.FileIndex.HasValue && sDto.FileIndex < staffUploads.Count)
                    {
                        avatarUrl = staffUploads[sDto.FileIndex.Value];
                    }

                    profile.Staffs.Add(new CenterStaff
                    {
                        Name = sDto.Name,
                        Role = sDto.Role,
                        Bio = sDto.Bio,
                        AvatarUrl = avatarUrl,
                        SortOrder = i
                    });
                }
            }

            await _context.SaveChangesAsync();
            return await GetCenterHomeAsync(baseUrl);
        }
    }
}