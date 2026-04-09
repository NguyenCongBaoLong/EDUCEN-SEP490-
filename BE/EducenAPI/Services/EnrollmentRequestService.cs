using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EducenAPI.Models;
using EducenAPI.Persistence.Contexts;
using EducenAPI.Services.Interface;
using Microsoft.EntityFrameworkCore;
using EducenAPI.DTOs.EnrollmentRequests;
using System;

namespace EducenAPI.Services
{
    public class EnrollmentRequestService : IEnrollmentRequestService
    {
        private readonly EducenV2Context _context;

        public EnrollmentRequestService(EducenV2Context context)
        {
            _context = context;
        }

        public async Task<IEnumerable<EnrollmentRequestDto>> GetAllRequestsAsync()
        {
            return await (from r in _context.EnrollmentRequests
                          join g in _context.Grades on r.GradeId equals g.GradeId into gj
                          from g in gj.DefaultIfEmpty()
                          join c in _context.Classes on r.ClassId equals c.ClassId into cj
                          from c in cj.DefaultIfEmpty()
                          orderby r.RequestDate descending
                          select new EnrollmentRequestDto
                          {
                              RequestId = r.RequestId,
                              FirstName = r.FirstName,
                              LastName = r.LastName,
                              Email = r.Email,
                              Phone = r.Phone,
                              PreferredCourse = r.PreferredCourse,
                              Address = r.Address,
                              ParentName = r.ParentName,
                              ParentPhone = r.ParentPhone,
                              ParentEmail = r.ParentEmail,
                              RequestDate = r.RequestDate,
                              Status = r.Status,
                              CreatedStudentId = r.CreatedStudentId,
                              GradeId = r.GradeId,
                              GradeName = g.GradeName,
                              ClassId = r.ClassId,
                              ClassName = c.ClassName,
                              RequestType = r.RequestType
                          }).ToListAsync();
        }

        public async Task<IEnumerable<EnrollmentRequestDto>> GetPendingRequestsAsync()
        {
            return await (from r in _context.EnrollmentRequests
                          join g in _context.Grades on r.GradeId equals g.GradeId into gj
                          from g in gj.DefaultIfEmpty()
                          join c in _context.Classes on r.ClassId equals c.ClassId into cj
                          from c in cj.DefaultIfEmpty()
                          where r.Status == "Pending"
                          orderby r.RequestDate descending
                          select new EnrollmentRequestDto
                          {
                              RequestId = r.RequestId,
                              FirstName = r.FirstName,
                              LastName = r.LastName,
                              Email = r.Email,
                              Phone = r.Phone,
                              PreferredCourse = r.PreferredCourse,
                              Address = r.Address,
                              ParentName = r.ParentName,
                              ParentPhone = r.ParentPhone,
                              ParentEmail = r.ParentEmail,
                              RequestDate = r.RequestDate,
                              Status = r.Status,
                              CreatedStudentId = r.CreatedStudentId,
                              GradeId = r.GradeId,
                              GradeName = g.GradeName,
                              ClassId = r.ClassId,
                              ClassName = c.ClassName,
                              RequestType = r.RequestType
                          }).ToListAsync();
        }

        public async Task<IEnumerable<EnrollmentRequestDto>> GetMyRequestsAsync(int userId)
        {
            // Get the user's email to match against enrollment requests
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return Enumerable.Empty<EnrollmentRequestDto>();

            // Only return ExistingStudentEnrollment type requests for this student
            return await (from r in _context.EnrollmentRequests
                          join c in _context.Classes on r.ClassId equals c.ClassId into cj
                          from c in cj.DefaultIfEmpty()
                          where r.Email == user.Email 
                                && r.RequestType == "ExistingStudentEnrollment"
                          orderby r.RequestDate descending
                          select new EnrollmentRequestDto
                          {
                              RequestId = r.RequestId,
                              ClassId = r.ClassId,
                              ClassName = c.ClassName,
                              Status = r.Status,
                              RequestDate = r.RequestDate,
                              RequestType = r.RequestType
                          }).ToListAsync();
        }

        public async Task<EnrollmentRequestDto?> GetRequestByIdAsync(int id)
        {
            return await (from r in _context.EnrollmentRequests
                          join g in _context.Grades on r.GradeId equals g.GradeId into gj
                          from g in gj.DefaultIfEmpty()
                          join c in _context.Classes on r.ClassId equals c.ClassId into cj
                          from c in cj.DefaultIfEmpty()
                          where r.RequestId == id
                          select new EnrollmentRequestDto
                          {
                              RequestId = r.RequestId,
                              FirstName = r.FirstName,
                              LastName = r.LastName,
                              Email = r.Email,
                              Phone = r.Phone,
                              PreferredCourse = r.PreferredCourse,
                              Address = r.Address,
                              ParentName = r.ParentName,
                              ParentPhone = r.ParentPhone,
                              ParentEmail = r.ParentEmail,
                              RequestDate = r.RequestDate,
                              Status = r.Status,
                              CreatedStudentId = r.CreatedStudentId,
                              GradeId = r.GradeId,
                              GradeName = g.GradeName,
                              ClassId = r.ClassId,
                              ClassName = c.ClassName,
                              RequestType = r.RequestType
                          }).FirstOrDefaultAsync();
        }

        public async Task<EnrollmentRequest> CreateRequestAsync(EnrollmentRequest request)
        {
            // Trim input
            request.Email = request.Email?.Trim();
            request.FirstName = request.FirstName?.Trim();
            request.LastName = request.LastName?.Trim();
            request.Phone = request.Phone?.Trim();

            // Validate required fields
            if (string.IsNullOrWhiteSpace(request.Email))
                throw new Exception("Email là bắt buộc.");
            if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName))
                throw new Exception("Họ và tên là bắt buộc.");
            if (string.IsNullOrWhiteSpace(request.Phone))
                throw new Exception("Số điện thoại là bắt buộc.");

            // Normalize and validate Phone (main)
            if (!string.IsNullOrWhiteSpace(request.Phone))
            {
                var normalizedPhone = new string(request.Phone.Where(char.IsDigit).ToArray());
                if (normalizedPhone.StartsWith("84")) normalizedPhone = "0" + normalizedPhone.Substring(2);
                
                if (normalizedPhone.Length != 10 || !normalizedPhone.StartsWith("0"))
                    throw new Exception("Số điện thoại không hợp lệ! Vui lòng nhập SĐT Việt Nam (10 số).");
                
                request.Phone = normalizedPhone; // Save normalized version
            }

            // Normal validation for Email
            var emailRegex = new System.Text.RegularExpressions.Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$");
            if (!emailRegex.IsMatch(request.Email))
                throw new Exception("Định dạng Email không hợp lệ.");

            // Normalize and validate ParentPhone if provided
            if (!string.IsNullOrWhiteSpace(request.ParentPhone))
            {
                var normalizedParentPhone = new string(request.ParentPhone.Where(char.IsDigit).ToArray());
                if (normalizedParentPhone.StartsWith("84")) normalizedParentPhone = "0" + normalizedParentPhone.Substring(2);

                if (normalizedParentPhone.Length == 10)
                {
                    request.ParentPhone = normalizedParentPhone;
                }
            }

            if (!string.IsNullOrWhiteSpace(request.ParentEmail) && !emailRegex.IsMatch(request.ParentEmail))
                throw new Exception("Định dạng Email phụ huynh không hợp lệ.");

            // Check duplicate email & phone trong enrollment requests (Pending)
            var duplicateRequest = await _context.EnrollmentRequests
                .FirstOrDefaultAsync(r => (r.Email == request.Email || r.Phone == request.Phone) && r.Status == "Pending");
            
            if (duplicateRequest != null)
            {
                if (duplicateRequest.Email == request.Email)
                    throw new Exception("Đã tồn tại yêu cầu đăng ký đang chờ duyệt với email này.");
                if (duplicateRequest.Phone == request.Phone)
                    throw new Exception("Đã tồn tại yêu cầu đăng ký đang chờ duyệt với số điện thoại này.");
            }

            // Kiểm tra nếu là GuestRegistration thì email và phone không được trùng với tài khoản Student đã có
            if (request.RequestType == "GuestRegistration")
            {
                var emailExists = await _context.Users.AnyAsync(u => u.Email == request.Email);
                if (emailExists)
                    throw new Exception("Email này đã được sử dụng bởi một tài khoản khác trong hệ thống!");

                var phoneExists = await _context.Users.AnyAsync(u => u.PhoneNumber == request.Phone && u.RoleId == 3); // Role 3 is Student
                if (phoneExists)
                    throw new Exception("Số điện thoại này đã được đăng ký bởi một học sinh khác! Vui lòng kiểm tra lại hoặc đăng nhập.");
            }

            // Xử lý ClassId và GradeId: Nếu là 0 hoặc <= 0 thì coi như null
            if (request.ClassId <= 0) request.ClassId = null;
            if (request.GradeId <= 0) request.GradeId = null;

            // Kiểm tra sĩ số nếu có chọn lớp hợp lệ
            if (request.ClassId.HasValue)
            {
                if (await IsClassFullAsync(request.ClassId.Value))
                {
                    throw new Exception("Rất tiếc, lớp học này đã đủ sĩ số tối đa. Vui lòng chọn lớp khác hoặc liên hệ trung tâm để được tư vấn.");
                }
            }

            request.Status = "Pending";
            request.RequestDate = DateTime.UtcNow;

            _context.EnrollmentRequests.Add(request);
            await _context.SaveChangesAsync();

            return request;
        }

        public async Task<EnrollmentRequest?> ApproveRequestAsync(int id)
        {
            var request = await _context.EnrollmentRequests.FindAsync(id);

            if (request == null)
                return null;

            if (request.Status != "Pending")
                throw new Exception("Yêu cầu đã được xử lý trước đó");

            // Check email đã tồn tại trong Users chưa
            User? user = null;
            Student? student = null;

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                user = await _context.Users
                    .Include(u => u.Student)
                    .FirstOrDefaultAsync(u => u.Email == request.Email);
            }

            if (user != null)
            {
                // Người dùng đã tồn tại -> Kiểm tra xem đã có Student record chưa
                student = user.Student;
                if (student == null)
                {
                    student = new Student
                    {
                        UserId = user.UserId,
                        EnrollmentStatus = "Active"
                    };
                    _context.Students.Add(student);
                }
                
                // Cập nhật thông tin cơ bản nếu cần
                user.FullName = $"{request.FirstName} {request.LastName}".Trim();
                user.PhoneNumber = request.Phone;
                user.Address = request.Address;
            }
            else
            {
                // Tạo User mới (Chỉ tạo thông tin, không tạo TK đăng nhập ngay)
                user = new User
                {
                    Username = null,
                    PasswordHash = null,
                    FullName = $"{request.FirstName} {request.LastName}".Trim(),
                    Email = request.Email,
                    PhoneNumber = request.Phone,
                    RoleId = 3, // Student role
                    AccountStatus = "NoAccount",
                    IsAccountSent = false,
                    Address = request.Address
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                // Tạo Student record mới
                student = new Student
                {
                    UserId = user.UserId,
                    EnrollmentStatus = "Active"
                };

                _context.Students.Add(student);
            }

            await _context.SaveChangesAsync();

            // Cập nhật request
            request.Status = "Approved";
            request.CreatedStudentId = student.UserId;

            // --- Tự động gán GradeId và Grade name từ bảng Grades ---
            if (request.GradeId != null)
            {
                student.GradeId = request.GradeId;
                // Lấy tên khối từ bảng Grades thay vì PreferredCourse
                var grade = await _context.Grades.FindAsync(request.GradeId);
                if (grade != null)
                {
                    student.Grade = grade.GradeName;
                }
            }

            if (request.ClassId != null)
            {
                // Kiểm tra sĩ số & trùng lịch
                if (await IsClassFullAsync(request.ClassId ?? 0))
                {
                    // Log cảnh báo hoặc throw exception tùy yêu cầu. 
                    // Ở đây Admin duyệt nên chúng ta cho phép vượt nếu muốn, nhưng theo yêu cầu là chặn.
                    throw new Exception("Lớp học đã đầy sĩ số tối đa.");
                }

                if (await IsScheduleConflictingAsync(student.UserId, request.ClassId ?? 0))
                {
                    throw new Exception("Lịch học của học sinh bị trùng với lịch của lớp học này.");
                }

                // Thêm học sinh vào lớp (Student và Class có quan hệ n-n)
                var targetClass = await _context.Classes.FindAsync(request.ClassId ?? 0);
                if (targetClass != null)
                {
                    if (targetClass.Students == null) targetClass.Students = new List<Student>();
                    targetClass.Students.Add(student);
                }
            }

            // --- Tự động liên kết phụ huynh nếu có thông tin ---
            if (!string.IsNullOrWhiteSpace(request.ParentName) && 
                (!string.IsNullOrWhiteSpace(request.ParentPhone) || !string.IsNullOrWhiteSpace(request.ParentEmail)))
            {
                // 1. Tìm tài khoản phụ huynh (Ưu tiên theo SĐT hoặc Email)
                User? parentUser = null;
                
                if (!string.IsNullOrWhiteSpace(request.ParentPhone))
                {
                    parentUser = await _context.Users
                        .Include(u => u.Parent)
                        .ThenInclude(p => p.Students)
                        .FirstOrDefaultAsync(u => u.PhoneNumber == request.ParentPhone && u.UserId != student.UserId);
                }
                
                if (parentUser == null && !string.IsNullOrWhiteSpace(request.ParentEmail))
                {
                    parentUser = await _context.Users
                        .Include(u => u.Parent)
                        .ThenInclude(p => p.Students)
                        .FirstOrDefaultAsync(u => u.Email == request.ParentEmail && u.UserId != student.UserId);
                }

                // 2. Nếu tìm thấy User nhưng chưa có record Parent, tạo thêm cho họ
                if (parentUser != null && parentUser.Parent == null)
                {
                    var newParent = new Parent { UserId = parentUser.UserId };
                    _context.Parents.Add(newParent);
                    await _context.SaveChangesAsync();
                    parentUser.Parent = newParent;
                }

                // 3. Nếu chưa có User nào, tạo mới hoàn toàn
                if (parentUser == null)
                {
                    parentUser = await CreateNewParentAsync(request);
                }

                // 4. Liên kết Học sinh với Phụ huynh (Cả 2 chiều để chắc chắn EF nhận diện)
                if (parentUser?.Parent != null)
                {
                    Console.WriteLine($"[DEBUG] Linking Student {student.UserId} with Parent {parentUser.UserId}");

                    if (parentUser.Parent.Students == null) parentUser.Parent.Students = new List<Student>();
                    if (student.Parents == null) student.Parents = new List<Parent>();
                    
                    if (!parentUser.Parent.Students.Any(s => s.UserId == student.UserId))
                    {
                        parentUser.Parent.Students.Add(student);
                    }

                    if (!student.Parents.Any(p => p.UserId == parentUser.UserId))
                    {
                        student.Parents.Add(parentUser.Parent);
                    }
                }
                else
                {
                    Console.WriteLine($"[DEBUG] Skipping parent linking: parentUser or parent record is null.");
                }
            }
            else
            {
                Console.WriteLine($"[DEBUG] No parent info found in request (ParentName: '{request.ParentName}')");
            }

            await _context.SaveChangesAsync();

            return request;
        }

        public async Task<bool> RejectRequestAsync(int id)
        {
            var request = await _context.EnrollmentRequests.FindAsync(id);

            if (request == null)
                return false;

            if (request.Status != "Pending")
                throw new Exception("Yêu cầu đã được xử lý trước đó");

            request.Status = "Rejected";

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<bool> IsScheduleConflictingAsync(int studentId, int classId)
        {
            // Lấy lịch của lớp học mục tiêu
            var targetClassSchedules = await _context.Schedules
                .Where(s => s.ClassId == classId)
                .ToListAsync();

            if (!targetClassSchedules.Any()) return false;

            // Lấy toàn bộ lịch của học sinh từ các lớp đã gán
            var studentSchedules = await _context.Schedules
                .Include(s => s.Class)
                .ThenInclude(c => c.Students)
                .Where(s => s.Class.Students.Any(stu => stu.UserId == studentId) && s.Class.Status == "Active")
                .ToListAsync();

            foreach (var target in targetClassSchedules)
            {
                foreach (var existing in studentSchedules)
                {
                    // So sánh: Cùng ngày và có khoảng thời gian giao nhau
                    if (target.DayOfWeek == existing.DayOfWeek)
                    {
                        if (IsTimeOverlap(target.StartTime, target.EndTime, existing.StartTime, existing.EndTime))
                        {
                            return true;
                        }
                    }
                }
            }

            return false;
        }

        public async Task<bool> IsClassFullAsync(int classId)
        {
            var cls = await _context.Classes
                .Include(c => c.Students)
                .FirstOrDefaultAsync(c => c.ClassId == classId);

            if (cls == null) return false;

            // Nếu MaxStudents <= 0 coi như không giới hạn (hoặc tùy cấu hình)
            if (cls.MaxStudents <= 0) return false;

            return cls.Students.Count >= cls.MaxStudents;
        }

        private bool IsTimeOverlap(TimeOnly start1, TimeOnly end1, TimeOnly start2, TimeOnly end2)
        {
            return start1 < end2 && start2 < end1;
        }

        public async Task<EnrollmentRequest> CreateStudentEnrollmentRequestAsync(int studentId, int gradeId, int classId)
        {
            var user = await _context.Users.FindAsync(studentId);
            if (user == null) throw new Exception("Không tìm thấy người dùng.");

            // Kiểm tra trùng lịch trước khi cho gửi yêu cầu
            if (await IsScheduleConflictingAsync(studentId, classId))
            {
                throw new Exception("Lịch học của bạn bị trùng với lớp học này. Vui lòng chọn lớp khác.");
            }

            // Kiểm tra sĩ số
            if (await IsClassFullAsync(classId))
            {
                throw new Exception("Rất tiếc, lớp học này đã đủ sĩ số.");
            }

            var request = new EnrollmentRequest
            {
                FirstName = user.FullName?.Split(' ').LastOrDefault() ?? "Student",
                LastName = string.Join(' ', user.FullName?.Split(' ').SkipLast(1) ?? new[] { "" }),
                Email = user.Email ?? string.Empty,
                Phone = user.PhoneNumber ?? string.Empty,
                Address = user.Address,
                GradeId = gradeId,
                ClassId = classId,
                RequestType = "ExistingStudentEnrollment",
                Status = "Pending",
                RequestDate = DateTime.UtcNow
            };

            _context.EnrollmentRequests.Add(request);
            await _context.SaveChangesAsync();

            return request;
        }

        private async Task<User> CreateNewParentAsync(EnrollmentRequest request)
        {

            var user = new User
            {
                Username = null,
                PasswordHash = null,
                FullName = request.ParentName,
                Email = request.ParentEmail,
                PhoneNumber = request.ParentPhone,
                RoleId = 4, // Parent role
                AccountStatus = "NoAccount",
                IsAccountSent = false,
                Address = request.Address
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var parent = new Parent
            {
                UserId = user.UserId
            };

            _context.Parents.Add(parent);
            await _context.SaveChangesAsync();

            user.Parent = parent;
            return user;
        }
    }
}
