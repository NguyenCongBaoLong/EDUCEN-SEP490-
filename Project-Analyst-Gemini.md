# Báo cáo Phân tích Hệ thống EDUCEN (Chi tiết & Nghiệp vụ chuẩn)

## 1. Tổng quan Nghiệp vụ
EDUCEN là nền tảng SaaS quản lý giáo dục đa thực thể (Multi-tenant). Hệ thống chia làm 2 lớp nghiệp vụ tách biệt:
- **Lớp Platform (Admin)**: Quản lý thuê bao, trung tâm, gói dịch vụ và thanh toán SaaS.
- **Lớp Operation (Tenant)**: Quản lý học vụ, tài chính và tương tác giữa Trung tâm - Giáo viên - Học sinh - Phụ huynh.

---

## 2. 07 Luồng Nghiệp vụ Chính (Main Workflows)

### Luồng 1: Vòng đời thuê bao SaaS (Tenant Lifecycle)
1. **Đăng ký**: Chủ trung tâm gửi đơn đăng ký + Giấy phép kinh doanh.
2. **Xét duyệt**: Hệ thống Admin (SysAdmin) kiểm tra tính hợp lệ và phê duyệt.
3. **Khởi tạo**: Hệ thống tự động tạo Database riêng cho Tenant, tạo tài khoản Admin cho trung tâm.
4. **Đăng ký gói**: Tenant chọn gói dịch vụ (Standard/Premium), thực hiện thanh toán để kích hoạt đầy đủ tính năng.

### Luồng 2: Thiết lập hạ tầng đào tạo (Academic Setup)
1. **Cấu hình**: Admin trung tâm tạo Môn học (Subject), Phòng học (Room - có sức chứa).
2. **Tạo lớp**: Admin tạo Lớp học (Class), thiết lập đơn giá mỗi buổi học (PricePerSession) - đây là Business Rule bắt buộc để tính học phí sau này.
3. **Xếp lịch**: Hệ thống tự động kiểm tra xung đột (Conflict Detection):
   - Giáo viên không được dạy 2 lớp cùng giờ.
   - Phòng học không được trùng lịch.
4. **Sinh buổi học**: Hệ thống tự động sinh danh sách các buổi học (ClassSessions) trong tương lai dựa trên lịch trình.

### Luồng 3: Tuyển sinh và Onboarding (Student Journey)
1. **Đăng ký học**: Học sinh đăng ký qua Form công khai hoặc Admin thêm thủ công.
2. **Xét duyệt**: Admin duyệt đơn -> Hệ thống tự động sinh tài khoản User, gửi email thông tin đăng nhập.
3. **Sắp lớp**: Học sinh được gán vào lớp. Hệ thống kiểm tra `MaxStudents` của lớp để ngăn vượt quá sĩ số.

### Luồng 4: Vận hành điểm danh & Tương tác (Daily Operations)
1. **Điểm danh**: Giáo viên/Trợ giảng thực hiện điểm danh qua Web/Mobile.
2. **Quy tắc thời gian (Business Rule)**: 
   - Giáo viên chỉ được điểm danh đúng ngày buổi học diễn ra.
   - Không được điểm danh các buổi trong tương lai.
3. **Yêu cầu sửa (Adjustment)**: Nếu quá ngày, giáo viên phải gửi `Modification Request`. Điểm danh chỉ thay đổi khi Admin phê duyệt.
4. **Thông báo**: Phụ huynh nhận thông báo ngay lập tức qua App/Zalo khi con được điểm danh (Present/Absent).

### Luồng 5: Quản lý Học vụ & LMS (Learning Management)
1. **Giao bài**: Giáo viên tạo bài tập (Assignment), đính kèm tài liệu (Materials).
2. **Nộp bài**: Học sinh tải bài làm lên hệ thống.
3. **Chấm điểm**: Giáo viên chấm điểm + Nhận xét. Phụ huynh theo dõi được tiến độ học tập qua biểu đồ.

### Luồng 6: Chu kỳ Tài chính & Học phí (Financial Cycle)
1. **Tính toán**: Đến cuối tháng, Admin chạy tác vụ tính học phí (Tuition Calculation). 
   - **Công thức**: `Học phí = Số buổi có mặt (Present) * Đơn giá buổi học`.
2. **Phát hành**: Tạo hóa đơn hàng loạt (Batch Invoice). Hóa đơn ở trạng thái `Draft` -> `Sent`.
3. **Khóa sổ (Invoice Lock)**: Admin thực hiện khóa dữ liệu tháng cũ. Sau khi khóa, không ai có thể sửa đổi điểm danh hoặc chi phí của tháng đó để đảm bảo tính minh bạch kế toán.

### Luồng 7: Thanh toán và Đối soát (Payment & Settlement)
1. **Thanh toán**: Phụ huynh xem hóa đơn gộp (Family Invoice - gom nhiều con/nhiều lớp) và thanh toán qua **VNPay**.
2. **Xác nhận**: Hệ thống tự động gạch nợ hóa đơn khi có Callback từ cổng thanh toán.
3. **Hoàn tiền (Refund)**: Nếu học sinh nghỉ có lý do hoặc trung tâm hủy lớp, quy trình hoàn tiền được kích hoạt qua phê duyệt 2 cấp.

---

## 3. Các Luồng phụ (Supporting Workflows)
- **Quản lý Hỗ trợ (Support Ticket)**: Người dùng gửi yêu cầu hỗ trợ kỹ thuật đến System Admin.
- **Cấu hình Zalo OA**: Mỗi trung tâm có thể kết nối Zalo Official Account riêng để gửi tin nhắn CSKH thương hiệu riêng.
- **Báo cáo doanh thu (Analytics)**: Thống kê dòng tiền theo tháng, theo lớp và dự báo doanh thu.
- **Nhập liệu hàng loạt (Excel Import)**: Cho phép import danh sách học sinh từ file Excel để tiết kiệm thời gian onboarding.

---

## 4. Các Quy tắc Nghiệp vụ chuẩn (Core Business Rules)

| Phân hệ | Quy tắc (Business Rule) |
|:---|:---|
| **Xác thực** | Sử dụng JWT + RBAC. Token có expire và refresh mechanism. |
| **Đa thực thể** | Dữ liệu Tenant nào nằm trong DB Tenant đó, không thể truy cập chéo. |
| **Điểm danh** | Teacher: Chỉ được sửa trong ngày. Admin: Được sửa bất cứ lúc nào (nhưng có Audit Log). |
| **Học phí** | Chỉ tính tiền những buổi trạng thái `Present` hoặc `Attended`. Buổi `Absent` không tính phí. |
| **Khóa sổ** | Khi tháng đã `Locked`, mọi API tác động đến `Attendance`, `Grade` và `Invoice` của tháng đó sẽ bị chặn (Http 400). |
| **Thanh toán** | Hóa đơn gộp (Family Invoice) chỉ được tạo cho các hóa đơn đơn lẻ ở trạng thái `Sent` hoặc `Overdue`. |
| **Hệ thống** | Tự động cập nhật trạng thái `Overdue` (Quá hạn) cho hóa đơn khi qua ngày `DueDate`. |

---

## 5. Đánh giá Kỹ thuật (Technical Evaluation)
- **Tính mở mở rộng**: Kiến trúc Service-Oriented giúp dễ dàng thêm các module mới (ví dụ: Module thi trực tuyến).
- **Tính nhất quán**: Sử dụng `Transaction` (Unit of Work) cho các luồng quan trọng (như tạo lớp kèm sinh buổi học), đảm bảo không bao giờ có dữ liệu rác.
- **Bảo mật**: Các trường nhạy cảm như `SecretKey` của Zalo, VNPay được mã hóa trước khi lưu vào DB.

---
**EDUCEN System Analysis 2026**
*Status: Verified against Source Code.*
