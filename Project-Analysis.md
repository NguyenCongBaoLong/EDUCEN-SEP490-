# Educen-SEP490 - Project Analysis

## Education Management System

---

## 1. Project Overview

| Property | Value |
|----------|-------|
| **Project Name** | Educen - Education Management System |
| **Type** | Multi-tenant SaaS Web Application |
| **Core Functionality** | Comprehensive education center management platform supporting student enrollment, class scheduling, attendance tracking, grade management, assignment submission, tuition invoicing, and payment processing |
| **Target Users** | Education centers, teachers, assistants, students, and parents |

### 1.1 Core Features Summary

- **Multi-tenant Architecture**: Isolated data management for each education center
- **User Management**: Role-based access control (RBAC) with 7 distinct roles
- **Academic Management**: Class scheduling, attendance tracking, grade management, assignment & submission
- **Financial Operations**: Tuition calculation, invoice generation, payment processing (VNPay), refunds, invoice locking
- **Communication**: In-app notifications, Zalo OA integration, email notifications, support tickets

---

## 2. Architecture

### 2.1 Technology Stack

#### Backend
| Component | Technology |
|-----------|------------|
| Framework | ASP.NET Core 8.0 |
| ORM | Entity Framework Core |
| Database | Multi-tenant isolation (per-tenant database schema) |
| Authentication | JWT-based with RBAC |
| External Integrations | VNPay Gateway, Zalo OA, Mail Service |

#### Frontend
| Component | Technology |
|-----------|------------|
| Framework | React 19 + Vite |
| Routing | React Router DOM |
| Notifications | React Hot Toast |
| Charts | Recharts |
| State Management | React Context/API |
| HTTP Client | Axios |

### 2.2 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Applications                           │
│  ┌──────────────────────────────┐    ┌──────────────────────────────┐ │
│  │        Web Application       │    │      Mobile Application      │ │
│  └──────────────────────────────┘    └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              EduCen API                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                      API Controllers                               │ │
│  │  Auth | Tenant | Subscription | Student | Class | Attendance |       │ │
│  │  Payment | Tuition | Invoice | Notification | Enrollment | Refund  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                    │                                    │
│                                    ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                     Business Services                                │ │
│  │  IAuthService | ITenantService | ISubscriptionService | IStudent   │ │
│  │  Service | IClassService | IAttendanceService | IPaymentService    │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│   External Services   │ │      Admin DB         │ │     Tenant DB         │
│  ┌────────────────┐  │ │  ┌────────────────┐  │ │  ┌────────────────┐  │
│  │   VNPay Gateway│  │ │  │ │   Tenants      │  │ │  │ │   Tenant Data │  │
│  │   Zalo OA      │  │ │  │ │   Subscriptions│ │ │  │ │   (Per Tenant)│  │
│  │   Mail Service │  │ │  │ │   Plans       │  │ │  │ └────────────────┘  │
│  └────────────────┘  │ │  │ │   Contracts  │  │ │  └─────────────────────────┘
└──────────────────────┘ │ │ └────────────────┘  │ └─────────────────────────┘
                         └──────────────────┘
```

### 2.3 Project Structure

```
EDUCEN-SEP490-/
├── BE/
│   └── EducenAPI/
│       ├── Controllers/           # API endpoints
│       ├── Models/              # Entity models
│       ├── Services/            # Business logic
│       ├── DTOs/               # Data transfer objects
│       ├── Middleware/          # Custom middleware
│       ├── Mappings/           # AutoMapper profiles
│       ├── Persistence/        # EF Core configuration
│       ├── Validators/          # Input validation
│       ├── Exceptions/         # Custom exceptions
│       └── Ultils/             # Utilities
├── frontend/
│   ├── src/
│   │   ├── pages/              # Page components
│   │   ├── services/           # API client services
│   │   ├── components/         # Reusable components
│   │   ├── hooks/             # Custom hooks
│   │   └── App.jsx            # Main application
│   ├── package.json
│   └── vite.config.js
├── sequence-diagrams.md         # Workflow documentation
└── SPEC.md                   # Specification document
```

---

## 3. User Roles (Actors)

| Role | Description | Permissions |
|------|------------|------------|
| **SystemAdmin** | Global platform administrator | Manage all tenants, plans, subscriptions, system-wide settings |
| **TenantAdmin** | Individual center administrator | Manage tenant-specific operations, users, classes, finances (same as Admin but tenant-scoped) |
| **Admin** | Center administrator (legacy) | Manage tenant-specific operations, users, classes, finances |
| **Teacher** | Instructional staff | Manage classes, attendance, grades, assignments, materials |
| **Assistant** | Classroom assistant | Support teaching, attendance, classroom management |
| **Student** | Enrolled learner | View grades, submit assignments, view schedule, make payments |
| **Parent** | Student guardian | View student progress, make payments, receive notifications |

---

## 4. Domain Entities

### 4.1 Core Entities

| Entity | Description | Key Fields |
|-------|------------|------------|
| **Tenant** | Education center (multi-tenant isolation) | TenantId, TenantName, SubDomain, IsActive, ConnectionString |
| **User** | Authentication and user management | UserId, Username, Email, PasswordHash, RoleId, TenantId |
| **Role** | User roles and permissions | RoleId, RoleName, Description |
| **Student** | Enrolled student records | UserId, FirstName, LastName, DateOfBirth, Gender, Phone, Email |
| **Parent** | Student guardians | UserId, StudentId, FullName, Email, Phone |
| **Teacher** | Instructional staff | UserId, Specialization, Bio, Experience |
| **Assistant** | Classroom support staff | UserId, UserId (linked to User), AssignedClasses |
| **Class** | Course offerings | ClassId, SubjectId, TeacherId, Name, Schedule, MaxStudents, Status |
| **Subject** | Academic subjects | SubjectId, SubjectName, Description, GradeLevel |
| **Schedule** | Class schedules (weekly recurring) | ScheduleId, ClassId, DayOfWeek, StartTime, EndTime, RoomId |
| **Room** | Physical/virtual classroom resources | RoomId, RoomName, Capacity, Location, IsActive |
| **ClassSession** | Individual class session | SessionId, ClassId, SessionDate, StartTime, EndTime, Status |
| **Attendance** | Student attendance records | AttendanceId, SessionId, StudentId, Status, Notes, RecordedBy |
| **AttendanceModificationRequest** | Request to modify attendance after deadline | RequestId, SessionId, StudentId, Status, RequestedStatus, Reason, RequestedByUserId |
| **Grade** | Academic performance | GradeId, StudentId, ClassId, Score, Category, RecordedAt |
| **Assignment** | Homework and assessments | AssignmentId, ClassId, Title, Description, DueDate, MaxScore |
| **Submission** | Student submissions | SubmissionId, AssignmentId, StudentId, FileUrl, SubmittedAt, Score, Status |
| **EnrollmentRequest** | Student enrollment applications | RequestId, FirstName, LastName, Email, Phone, Status, RequestDate |

### 4.2 Financial Entities

| Entity | Description | Key Fields |
|-------|------------|------------|
| **Subscription** | Center subscription plans | SubscriptionId, TenantId, PlanId, StartDate, EndDate, Status |
| **Plan** | Subscription tier definitions | PlanId, PlanName, PricePerMonth, MaxStudents, Features |
| **TenantContract** | Contract terms | ContractId, TenantId, StartDate, EndDate, Terms, Status |
| **TuitionInvoice** | Invoice records | InvoiceId, StudentId, ClassId, Amount, DueDate, Status |
| **TuitionInvoiceItem** | Individual invoice line items | ItemId, InvoiceId, Description, Quantity, UnitPrice, Total |
| **InvoiceLock** | Lock invoice editing by month | Id, Month, Year, IsLocked, LockedBy, LockedAt, UnlockedAt |
| **FamilyInvoice** | Parent-facing consolidated invoice | InvoiceId, FamilyId, TotalAmount, DueDate, Status |
| **PaymentTransaction** | Payment records | TransactionId, PaymentId, Amount, Gateway, Status, CreatedAt |
| **PaymentRecord** | Payment details per tenant | PaymentId, TenantId, InvoiceId, Amount, Status, PaidAt |
| **RefundRequest** | Refund applications | RefundId, PaymentId, Amount, Reason, Status, CreatedAt |
| **TenantCreditLedger** | Credit system tracking | LedgerId, TenantId, CreditBalance, Transactions |

### 4.3 Communication Entities

| Entity | Description | Key Fields |
|-------|------------|------------|
| **Notification** | In-app notifications | NotificationId, UserId, Title, Message, Type, IsRead, CreatedAt |
| **SupportRequest** | Help desk tickets | RequestId, UserId, Title, Description, Status, Priority, CreatedAt |
| **LessonMaterial** | Educational resources | MaterialId, ClassId, Title, FileUrl, UploadedAt |

### 4.4 Center Management Entities

| Entity | Description | Key Fields |
|-------|------------|------------|
| **CenterProfile** | Center information page | CenterProfileId, Name, LogoUrl, Tagline, Address, Phone, Email, Website, PrimaryColor, BackgroundColor |
| **CenterImage** | Gallery images | ImageId, CenterProfileId, ImageUrl, SortOrder |
| **CenterHighlight** | Featured highlights | HighlightId, CenterProfileId, Icon, Text, SortOrder |
| **CenterHeroImage** | Hero banner images | HeroImageId, CenterProfileId, ImageUrl, Title, SubTitle, ButtonText, ButtonLink, SortOrder |
| **CenterStaff** | Staff members | StaffId, CenterProfileId, Name, Position, ImageUrl, SortOrder |
| **ResourceFile** | File storage | Id, FileName, ContentType, FilePath, Extension, FileSize, LessonMaterialId, AssignmentId |

### 4.5 Integration Entities

| Entity | Description | Key Fields |
|-------|------------|------------|
| **TenantZaloOAConfig** | Zalo Official Account configuration | ConfigId, TenantId, OAId, Secret, IsActive |
| **TenantPaymentGatewayConfig** | Payment gateway settings | ConfigId, TenantId, GatewayType, MerchantId, APIKey, IsActive |
| **TenantRegistration** | Tenant registration requests | RegistrationId, CenterName, ContactPerson, Email, PhoneNumber, Status, CreatedAt |
| **SystemAdmin** | Platform admin account | SysAdminId, Username, PasswordHash |

---

## 5. Key Use Cases

### 5.1 Authentication & Authorization
- User registration with role selection
- JWT-based login with secure token generation
- Password reset via email
- Role-based access control enforcement

### 5.2 Tenant Registration & Management
- New tenant registration request
- SystemAdmin approval workflow
- Tenant database creation and seeding
- Subscription assignment

### 5.3 Student Enrollment
- Enrollment request submission (public/guest)
- Student self-enrollment (existing students enrolling in classes)
- Admin approval/rejection
- Automatic account creation
- Email notification with credentials

### 5.4 Class Management
- Class CRUD operations
- Student enrollment in classes
- Teacher assignment
- Parent/Student view classes
- Import students from Excel

### 5.5 Scheduling & Attendance
- Weekly schedule configuration
- Class session generation
- Teacher/Assistant attendance marking
- Bulk attendance marking
- Quick attendance (mark all present)
- Attendance modification request workflow (for past sessions)
- Attendance reporting and session summary

### 5.6 Grade & Assignment Management
- Assignment creation and grading
- Student submission tracking
- Late submission handling
- Performance reporting

### 5.7 Tuition & Invoice Management
- Tuition calculation per class
- Individual invoice generation
- Family invoice consolidation
- Due date management
- Invoice locking by month (prevent editing after deadline)
- Batch invoice creation

### 5.8 Payment Processing
- Payment creation with VNPay
- Callback processing
- Transaction verification
- Payment confirmation from frontend

### 5.9 Notifications
- In-app notifications
- Role-based filtering
- Payment reminders (single/batch)
- Zalo OA integration
- Email notifications

### 5.10 Refund Management
- Refund request creation
- Approval workflow
- VNPay refund processing
- Status tracking

### 5.11 Subscription Management
- Plan management
- Subscription registration
- Expiration monitoring
- Credit usage tracking

### 5.12 Support Requests
- Ticket creation
- Status management
- Priority handling
- Resolution tracking

### 5.13 Center Profile Management
- Custom branding (logo, colors, images)
- Hero images with call-to-action
- Gallery management
- Highlight features

---

## 6. Main Workflows

### 6.1 Mở trung tâm (Open Center)

```
┌──────────────┐     ┌────────────────────┐     ┌─────────────────┐     ┌──────────┐
│  Khách hàng │────▶│   Registration     │────▶│     API         │────▶│ Database │
│             │     │     Form          │     │                 │     │          │
└──────────────┘     └────────────────────┘     └─────────────────┘     └──────────┘
         │                                            │
         │◀──────────────────────────────────────────┤
         │           Registration Created             │
         │                                            ▼
         │                           ┌─────────────────────────────────────────┐
         │                           │  SystemAdmin duyệt/từ chối đăng ký     │
         │                           │  PUT api/registrations/{id}/status       │
         │                           └─────────────────────────────────────────┘
         │                                            │
         │                                            ▼
┌──────────────┐     ┌────────────────────┐     ┌─────────────────┐     ┌──────────┐
│ SystemAdmin  │────▶│   Subscription    │────▶│     API         │────▶│ Database │
│             │     │    Panel           │     │                 │     │          │
└──────────────┘     └────────────────────┘     └─────────────────┘     └──────────┘
         │                                            │
         │◀──────────────────────────────────────────┤
         │           Tenant Active + Subscribed        │
```

**Các bước thực hiện:**
1. Khách hàng gửi đăng ký trung tâm → `POST api/registrations`
2. SystemAdmin duyệt/từ chối đăng ký → `PUT api/registrations/{id}/status`
3. SystemAdmin đăng ký gói dịch vụ → `POST api/admin/tenants/subscribe`

---

### 6.2 Nâng cấp gói dịch vụ (Upgrade Service Package)

```
┌──────────────┐     ┌────────────────────┐     ┌─────────────────┐     ┌──────────┐
│   TenantAdmin │────▶│   Subscription    │────▶│     API         │────▶│ Database │
│             │     │    Panel          │     │                 │     │          │
└──────────────┘     └────────────────────┘     └─────────────────┘     └──────────┘
         │
         ├────────────────────────────────────────────────┐
         │                                                │
         ▼                                                ▼
┌────────────────────┐                         ┌────────────────────┐
│   Đổi gói dịch vụ │                         │   Gia hạn dịch vụ  │
│ POST change-plan  │                         │  POST renew        │
└────────────────────┘                         └────────────────────┘
         │                                                │
         │                                                ▼
         │                              ┌────────────────────────────────────┐
         │                              │  POST api/admin/tenants/renew       │
         │                              └────────────────────────────────────┘
         │
         ▼
┌────────────────────┐
│   Hủy gói dịch vụ  │
│ POST cancel        │
└────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│  POST api/admin/tenants/{tenantId}/cancel │
└────────────────────────────────────┘
```

**Các bước thực hiện:**
1. Đổi gói dịch vụ → `POST api/admin/tenants/change-plan`
2. Gia hạn gói dịch vụ → `POST api/admin/tenants/renew`
3. Hủy gói dịch vụ → `POST api/admin/tenants/{tenantId}/cancel`

---

### 6.3 Học sinh đăng ký học và tạo tài khoản

```
┌──────────────┐     ┌────────────────────┐     ┌─────────────────┐     ┌──────────┐
│   Khách     │────▶│   Enrollment       │────▶│     API         │────▶│ Database │
│   (Guest)   │     │    Form           │     │                 │     │          │
└──────────────┘     └────────────────────┘     └─────────────────┘     └──────────┘
         │                                            │
         │◀──────────────────────────────────────────┤
         │           Enrollment Request Created     │
         │                                            ▼
         │                           ┌─────────────────────────────────────────┐
         │                           │  Admin duyệt yêu cầu đăng ký              │
         │                           │  PUT api/enrollment-requests/{id}/approve │
         │                           └─────────────────────────────────────────┘
         │                                            │
         │                                            ▼
         │                           ┌──────────────┐    ┌──────────────┐    ┌──────────┐
         │                           │  Tạo Student │    │ Tạo User     │    │ Gửi email │
         │                           └──────────────┘    └──────────────┘    └──────────┘
         │                                            │
         │◀──────────────────────────────────────────┤
         │           Account Created + Credentials   │
         │                                            ▼
┌──────────────┐     ┌────────────────────┐     ┌─────────────────┐     ┌──────────┐
│   Học sinh   │────▶│   Self-Enrollment   │────▶│     API         │────▶│ Database │
│             │     │    Request          │     │                 │     │          │
└──────────────┘     └────────────────────┘     └─────────────────┘     └──────────┘
```

**Các bước thực hiện:**
1. Khách gửi yêu cầu đăng ký → `POST api/enrollment-requests`
2. Admin duyệt → tạo Student + User + gửi email → `PUT api/enrollment-requests/{id}/approve`
3. Học sinh đăng ký lớp mới → `POST api/enrollment-requests/student-enroll`

---

### 6.4 Tạo lớp học và thêm học sinh

```
┌──────────────┐     ┌────────────────────┐     ┌─────────────────┐     ┌──────────┐
│    Admin     │────▶│   Class Management │────▶│     API         │────▶│ Database │
│             │     │    Panel           │     │                 │     │          │
└──────────────┘     └────────────────────┘     └─────────────────┘     └──────────┘
         │
         ├─────────────────────────────────────────────────────────────┐
         │                                                             │
         ▼                                                             ▼
┌────────────────────┐                                       ┌────────────────────┐
│   Tạo lớp học mới  │                                       │  Import từ Excel   │
│  POST api/classes │                                       │ POST import-students │
└────────────────────┘                                       └────────────────────┘
         │                                                             │
         │                                                             ▼
         │                         ┌────────────────────────────────────┐
         │                         │  POST api/classes/{id}/import-students│
         │                         └────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│  POST api/classes                  │
└────────────────────────────────────┘
         │
         ▼
┌──────────────┐     ┌────────────────────┐     ┌─────────────────┐     ┌──────────┐
│    Admin     │────▶│   Add Student      │────▶│     API         │────▶│ Database │
│             │     │    to Class       │     │                 │     │          │
└──────────────┘     └────────────────────┘     └─────────────────┘     └──────────┘
         │                                            │
         │◀──────────────────────────────────────────┤
         │           Student Added to Class            │
```

**Các bước thực hiện:**
1. Admin tạo lớp → `POST api/classes`
2. Admin thêm học sinh vào lớp → `POST api/classes/{id}/students/{studentId}`
3. Học sinh tự đăng ký lớp → `POST api/enrollment-requests/student-enroll`
4. Import học sinh từ Excel → `POST api/classes/{id}/import-students`

---

### 6.5 Luồng điểm danh

```
┌──────────────┐     ┌────────────────────┐     ┌─────────────────┐     ┌──────────┐
│   Giáo viên   │────▶│   Attendance      │────▶│     API         │────▶│ Database │
│             │     │    Panel           │     │                 │     │          │
└──────────────┘     └────────────────────┘     └─────────────────┘     └──────────┘
         │
         ├─────────────────────────────────────────────────────────────┐
         │                                                             │
         ▼              ▼              ▼              ▼                │
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐    │
│   Bulk      │ │   Quick    │ │   Update   │ │  Modification     │    │
│  Marking    │ │  Marking   │ │   Single   │ │    Request        │    │
└────────────┘ └────────────┘ └────────────┘ └────────────────────┘    │
     │             │              │              │                      │
     ▼             ▼              ▼              ▼                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  POST api/attendance/session/{sessionId}/bulk                        │
│  POST api/attendance/session/{sessionId}/quick                      │
│  PUT api/attendance/{attendanceId}                                 │
│  POST api/attendance/modification-request                           │
└────────────────────────────────────────────────────────────────────────────┘
         │                                          │
         │                                          ▼
         │                         ┌─────────────────────────────────────────┐
         │                         │  Admin duyệt yêu cầu sửa điểm danh       │
         │                         │  PUT api/attendance/modification-      │
         │                         │        requests/{requestId}/approve     │
         │                         └─────────────────────────────────────────┘
```

**Các bước thực hiện:**
1. GV điểm danh hàng loạt → `POST api/attendance/session/{sessionId}/bulk`
2. GV điểm danh nhanh → `POST api/attendance/session/{sessionId}/quick`
3. Cập nhật điểm danh → `PUT api/attendance/{attendanceId}`
4. GV gửi yêu cầu sửa điểm danh → `POST api/attendance/modification-request`
5. Admin duyệt yêu cầu sửa → `PUT api/attendance/modification-requests/{requestId}/approve`

---

### 6.6 Giao bài và chấm điểm

```
┌──────────────┐     ┌────────────────────┐     ┌─────────────────┐     ┌──────────┐
│   Giáo viên  │────▶│   Assignment      │────▶│     API         │────▶│ Database │
│             │     │    Management     │     │                 │     │          │
└──────────────┘     └────────────────────┘     └─────────────────┘     └──────────┘
         │                                            │
         │◀──────────────────────────────────────────┤
         │           Assignment Created              │
         │                                            ▼
         │                           ┌─────────────────────────────────────────┐
         │                           │  Học sinh nộp bài                       │
         │                           │  POST api/submissions                  │
         │                           └─────────────────────────────────────────┘
         │                                            │
         │◀──────────────────────────────────────────┤
         │           Submission Received            │
         │                                            ▼
┌──────────────┐     ┌────────────────────┐     ┌─────────────────┐     ┌──────────┐
│   Giáo viên  │────▶│   Grade Management  │────▶│     API         │────▶│ Database │
│             │     │    Panel           │     │                 │     │          │
└──────────────┘     └────────────────────┘     └─────────────────┘     └──────────┘
         │
         ├─────────────────────────────────────────────────────────────┐
         │                                                             │
         ▼                                                             ▼
┌────────────────────┐                                       ┌────────────────────┐
│   Chấm điểm & Công  │                                       │  Chấm điểm trực    │
│      bố điểm       │                                       │  tiếp (không nộp)  │
│                   │                                       │                   │
│ PUT submissions/  │                                       │ PUT submissions/  │
│ {subId}/grade     │                                       │ assignment/{aid}/ │
│ + publish         │                                       │ student/{sid}/    │
│                   │                                       │ grade             │
└────────────────────┘                                       └────────────────────┘
```

**Các bước thực hiện:**
1. GV tạo bài tập → `POST api/assignments/Create-Assignments`
2. HS nộp bài → `POST api/submissions`
3. GV chấm điểm → `PUT api/submissions/{subId}/grade`
4. GV công bố điểm → `PUT api/submissions/{subId}/publish`
5. GV chấm điểm không cần nộp bài → `PUT api/submissions/assignment/{assignmentId}/student/{studentId}/grade`

---

### 6.7 Thanh toán học phí (Phụ huynh thanh toán)

```
┌──────────────┐     ┌────────────────────┐     ┌─────────────────┐     ┌──────────┐
│    Admin    │────▶│   Invoice          │────▶│     API         │────▶│ Database │
│             │     │    Management     │     │                 │     │          │
└──────────────┘     └────────────────────┘     └─────────────────┘     └──────────┘
         │
         ├────────────────────────────────────────┐
         │                                        │
         ▼                                        ▼
┌────────────────────┐               ┌────────────────────┐
│  Tạo hóa đơn đơn   │               │  Tạo hóa đơn hàng loạt │
│  POST api/invoices │               │  POST api/invoices/batch │
└────────────────────┘               └────────────────────┘
         │                                        │
         ▼                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│  POST api/tuition/invoices                                     │
│  POST api/tuition/invoices/batch                            │
└────────────────────────────────────────────────────────────────────────┘
         │                                            │
         │◀──────────────────────────────────────────┤
         │           Invoice Created                 │
         │                                            ▼
         │                           ┌─────────────────────────────────────────┐
         │                           │  Phụ huynh xem hóa đơn chưa thanh toán   │
         │                           │  GET api/tuition/outstanding             │
         │                           └─────────────────────────────────────────┘
         │                                            │
         │◀──────────────────────────────────────────┤
         │           Danh sách hóa đơn                 │
         │                                            ▼
┌──────────────┐     ┌────────────────────┐     ┌─────────────────┐     ┌──────────┐
│   Phụ huynh  │────▶│   Family Invoice   │────▶│     API         │────▶│ Database │
│             │     │     Payment        │     │                 │     │          │
└──────────────┘     └────────────────────┘     └─────────────────┘     └──────────┘
         │
         ├────────────────────────────────────────────────┐
         │                                                │
         ▼                                                ▼
┌────────────────────┐                         ┌────────────────────┐
│   Tạo hóa đơn gộp   │                         │   Thanh toán        │
│  POST create-family │                         │  POST pay-family   │
└────────────────────┘                         └────────────────────┘
         │                                                │
         ▼                                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│  POST api/family-invoices/create-family                         │
│  POST api/family-invoices/pay-family/{invoiceId}          │
│  POST api/tuition/invoices/{invoiceId}/mark-as-paid         │
└────────────────────────────────────────────────────────────────────────┘
```

**Các bước thực hiện:**
1. Admin tạo hóa đơn → `POST api/tuition/invoices`
2. Admin tạo hóa đơn hàng loạt → `POST api/tuition/invoices/batch`
3. Xem hóa đơn chưa thanh toán → `GET api/tuition/outstanding`
4. Phụ huynh tạo hóa đơn gộp → `POST api/family-invoices/create-family`
5. Phụ huynh thanh toán → `POST api/family-invoices/pay-family/{invoiceId}`
6. Admin xác nhận thu tiền mặt → `POST api/tuition/invoices/{invoiceId}/mark-as-paid`

---

## 7. API Endpoints

### 7.1 Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/register` | POST | User registration |
| `/api/auth/forgot-password` | POST | Request password reset |
| `/api/auth/reset-password` | POST | Reset password |
| `/api/auth/reset-password/confirm` | POST | Confirm password reset |

### 7.2 Tenant Management Endpoints

| Endpoint | Method | Description |
|----------|--------|------------|
| `/api/tenants` | GET/POST | Tenant CRUD |
| `/api/tenants/reg` | POST | Tenant registration |
| `/api/tenants/{tenantId}/admins` | GET/POST | Tenant admin management |
| `/api/tenant-registrations` | GET/PUT | Registration management |

### 7.3 Subscription Endpoints

| Endpoint | Method | Description |
|----------|--------|------------|
| `/api/subscriptions` | GET/POST | Subscription CRUD |
| `/api/subscriptions/register` | POST | Register subscription |
| `/api/plans` | GET | Plan definitions |

### 7.4 User Management Endpoints

| Endpoint | Method | Description |
|----------|--------|------------|
| `/api/users/profile` | GET/PUT | User profile |
| `/api/students` | GET/POST/PUT/DELETE | Student CRUD |
| `/api/parents` | GET/POST/PUT/DELETE | Parent CRUD |
| `/api/teachers` | GET/POST/PUT/DELETE | Teacher CRUD |
| `/api/assistants` | GET/POST/PUT/DELETE | Assistant CRUD |
| `/api/admin` | * | Admin operations |

### 7.5 Academic Management Endpoints

| Endpoint | Method | Description |
|----------|--------|------------|
| `/api/classes` | GET/POST/PUT/DELETE | Class management |
| `/api/classes/{id}/students/{studentId}` | POST | Add student to class |
| `/api/classes/{id}/import-students` | POST | Import students |
| `/api/classes/teacher/my-classes` | GET | Teacher view their classes |
| `/api/classes/parent/child/{childId}/classes` | GET | Parent view child's classes |
| `/api/classes/parent/child/{childId}/class/{classId}/detail` | GET | Parent view child's class detail |
| `/api/subjects` | GET/POST/PUT/DELETE | Subject management |
| `/api/schedules` | GET/POST/PUT/DELETE | Schedule management |
| `/api/rooms` | GET/POST/PUT/DELETE | Room management |
| `/api/attendance/session/{sessionId}` | GET | Get attendance by session |
| `/api/attendance/student/{studentId}` | GET | Get attendance by student |
| `/api/attendance/class/{classId}/report` | GET | Get class attendance report |
| `/api/attendance/class/{classId}/sessions-summary` | GET | Get class sessions summary |
| `/api/attendance/session/{sessionId}/bulk` | POST | Bulk attendance marking |
| `/api/attendance/session/{sessionId}/quick` | POST | Quick attendance marking |
| `/api/attendance/{attendanceId}` | PUT | Update attendance |
| `/api/attendance/session/{sessionId}/can-attend` | GET | Check if can attend session |
| `/api/attendance/modification-request` | POST | Create attendance modification request |
| `/api/attendance/modification-requests/pending` | GET | Get pending modification requests |
| `/api/attendance/modification-requests/my` | GET | Get my modification requests |
| `/api/attendance/modification-requests/{requestId}/approve` | PUT | Approve modification request |
| `/api/attendance/modification-requests/{requestId}/reject` | PUT | Reject modification request |
| `/api/grades` | GET/POST/PUT | Grade management |
| `/api/assignments` | GET/POST/PUT/DELETE | Assignment management |
| `/api/submissions` | GET/POST | Submission management |
| `/api/teacher-report` | GET | Teacher reports |

### 7.6 Financial Endpoints

| Endpoint | Method | Description |
|----------|--------|------------|
| `/api/tuition/calculate` | POST | Calculate tuition |
| `/api/tuition/calculate-class` | POST | Calculate class tuition |
| `/api/tuition/invoices` | GET/POST | Invoice CRUD |
| `/api/tuition/invoices/{invoiceId}` | GET | Get invoice detail |
| `/api/tuition/invoices/{invoiceId}/send` | POST | Send invoice |
| `/api/tuition/invoices/{invoiceId}/cancel` | POST | Cancel invoice |
| `/api/tuition/invoices/{invoiceId}/mark-as-paid` | POST | Mark invoice as paid |
| `/api/tuition/invoices/batch` | POST | Create batch invoices |
| `/api/tuition/lock` | POST | Lock invoice editing for month |
| `/api/tuition/unlock` | POST | Unlock invoice editing |
| `/api/tuition/lock/{month}/{year}` | GET | Get lock info |
| `/api/tuition/my-invoices` | GET | Student/Parent view their invoices |
| `/api/tuition/outstanding` | GET | Get outstanding invoices |
| `/api/tuition/update-overdue` | POST | Update overdue invoices |
| `/api/family-invoice` | GET/POST/PUT | Family invoicing |
| `/api/family-invoice/{id}/send` | POST | Send invoice |
| `/api/family-invoice/{id}/cancel` | POST | Cancel invoice |
| `/api/payments/create` | POST | Create payment |
| `/api/payments/vnpay/callback` | POST/GET | VNPay callback |
| `/api/payments/verify/{id}` | GET | Verify payment |
| `/api/payments/confirm` | POST | Frontend confirm payment |
| `/api/refunds` | GET/POST | Refund requests |
| `/api/refunds/{id}/approve` | POST | Approve refund |
| `/api/refunds/{id}/reject` | POST | Reject refund |
| `/api/refunds/{id}/process` | POST | Process refund |
| `/api/revenue-reports` | GET | Revenue reports |
| `/api/center-dashboard` | GET | Center analytics |

### 7.7 Communication Endpoints

| Endpoint | Method | Description |
|----------|--------|------------|
| `/api/notifications` | GET/POST | Notifications |
| `/api/notifications/{id}/read` | POST | Mark as read |
| `/api/notifications/send-reminder/{invoiceId}` | POST | Send reminder |
| `/api/notifications/send-batch-reminders` | POST | Batch reminders |
| `/api/support-requests` | GET/POST/PUT | Support tickets |
| `/api/materials` | GET/POST/DELETE | Lesson materials |

### 7.8 Enrollment Endpoints

| Endpoint | Method | Description |
|----------|--------|------------|
| `/api/enrollment-requests` | GET/POST | Enrollment requests (public) |
| `/api/enrollment-requests/pending` | GET | Get pending requests |
| `/api/enrollment-requests/{id}` | GET | Get request by ID |
| `/api/enrollment-requests/{id}/approve` | POST | Approve request |
| `/api/enrollment-requests/{id}/reject` | POST | Reject request |
| `/api/enrollment-requests/my-requests` | GET | Student view their requests |
| `/api/enrollment-requests/student-enroll` | POST | Student self-enroll in class |

### 7.9 Center Management Endpoints

| Endpoint | Method | Description |
|----------|--------|------------|
| `/api/center-home` | GET/PUT | Center home page settings |
| `/api/center-dashboard` | GET | Center dashboard analytics |
| `/api/revenue-reports` | GET | Revenue reports |

---

## 8. Entity Relationship Diagram (Simplified)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           TENANT (Education Center)                               │
│  ┌──────────────┐    ┌────────────────┐    ┌─────────────────┐                │
│  │ Subscription│◀───│ TenantContract │───▶│ TenantCreditLgr │                │
│  └──────────────┘    └────────────────┘    └─────────────────┘                │
│         │                                                                  │
│         ▼                                                                  │
│  ┌──────────────┐    ┌────────────────┐    ┌─────────────────┐    ┌────────┐ │
│  │    User    │◀───│     Role      │───▶│  CenterStaff   │◀───│Teacher │ │
│  │   (7 roles)│    │   (7 roles)   │    │(T/Asst/Admin)│    │        │ │
│  └──────┬─────┘    └────────────────┘    └─────────────────┘    └────────┘ │
│        │                                                                   │
│        ├──────────────────────────────────┬──────────────────────────────┐        │
│        ▼                                ▼                              ▼        │
│  ┌──────────────┐                ┌──────────────┐            ┌────────────┐ │
│  │  Student   │───────┬─────────▶│  Classroom  │◀───────────│  Subject  │ │
│  │ (enrolled) │       │         │   (Class)   │            │          │ │
│  └─────┬─────┘       │         └──────┬─────┘            └────────────┘ │
│        │        │         ┌──────────────┼───┐          ┌──────┐        │        │
│        │        │         │   Schedule  │   │          │ Room │        │        │
│        │        │         └─────┬──────┘   │          └──────┘        │        │
│        │        │           ┌─────┴─────┐   ▼                       │        │
│        ▼        ▼         │ClassSession│   │                   ┌──────┴─────┐  │
│  ┌──────────────┐      └─────┬─────┘   │◀────────────│  Enrollment │  │
│  │    Parent   │◀──────────┤        │           │  Request   │  │
│  │  (guardian)│         │        │           │           └──────────────┘  │
│  └───────────┘         │        │           │                       │        │
│        │            ▼        │           ▼                       │        │
│        │      ┌──────────┐││         ┌──────────┐             │        │
│        │      │Attendance││└─────────│  Grade  │◀──────────────┤        │
│        │      └──────────┘│          └──────────┘              │        │
│        │                 │          ┌──────────┐                │        │
│        │                 └────────▶│Assignment│◀─────────────┬─┘        │
│        │                            └────┬─────┘             │        │
│        │                                 │                    │        │
│        │◀────────────────────────────────┤                    │        │
│        │       ┌──────────┐            │◀───────────────────┘        │
│        └──────│ Submission│◀─────────┘                            │
│              └──────────┘                                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                           ATTENDANCE MODIFICATION                              │
│  ┌──────────────────────────┐    ┌──────────────┐    ┌─────────────────┐      │
│  │AttendanceModification  │───▶│ClassSession  │◀───│ AttendanceRecord│      │
│  │        Request          │    │              │    │                 │      │
│  └─────────┬───────────────┘    └──────────────┘    └─────────────────┘      │
│            │                              │                                   │
│            │                              ▼                                   │
│            │                    ┌──────────────────┐                         │
│            └───────────────────▶│    Admin Review  │                         │
│                               │ Approve/Reject   │                         │
│                               └──────────────────┘                         │
└────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                              FINANCIAL ENTITIES                         │
│  ┌──────────────┐    ┌────────────────┐    ┌─────────────────┐                │
│  │ TuitionInv │◀───│TuitionInvoice│───▶│ FamilyInvoice │                │
│  │    Item   │    │             │    │   (parent)   │                │
│  └──────┬─────┘    └──────┬─────┘    └────────┬────────┘                │
│         │                │              │             │                        │
│         └────────────────┼──────────────┼─────────────────────────┘
│                          │              ▼                            
│                    ┌─────┴─────┐    ┌──────────┐                    
│                    │ InvoiceLock│   │ Payment  │                    
│                    │ (Month)   │   │ Record   │                    
│                    └───────────┘   └──────┬───┘                    
│                          │              │                           
│                          ▼              ▼                            
│                    ┌──────────┐    ┌──────────┐                    
│                    │ Refund   │◀───│ VNPay    │                    
│                    │ Request │    │ Gateway │                    
│                    └──────────┘    └──────────┘                    
└────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                             CENTER PROFILE ENTITIES                       │
│  ┌──────────────┐    ┌────────────────┐    ┌─────────────────┐                │
│  │CenterProfile│◀───│ CenterImage   │───▶│CenterHighlight │                │
│  │             │    │  (Gallery)    │    │                 │                │
│  └──────────────┘    └───────┬──────┘    └────────┬────────┘                │
│         │                    │                    │                          │
│         └────────────────────┼────────────────────┘                          │
│                              ▼                                              │
│                    ┌─────────────────┐                                      │
│                    │CenterHeroImage  │                                      │
│                    │ (Banners)       │                                      │
│                    └─────────────────┘                                      │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Technology Dependencies

### 9.1 Backend Dependencies

| Package | Purpose |
|---------|--------|
| Microsoft.EntityFrameworkCore | ORM and database access |
| Microsoft.IdentityModel.Tokens | JWT token handling |
| System.IdentityModel.Tokens.Jwt | JWT authentication |
| BCrypt.Net-Next | Password hashing |

### 9.2 Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.0 | UI Framework |
| react-router-dom | ^7.13.0 | Routing |
| axios | ^1.13.4 | HTTP Client |
| recharts | ^3.7.0 | Charts |
| lucide-react | ^0.563.0 | Icons |
| react-hot-toast | ^2.6.0 | Notifications |

---

## 10. Key Features Summary

### 10.1 Multi-Tenancy
- Tenant isolation via middleware
- Per-tenant database schema
- Tenant-specific configuration (Zalo, Payment Gateway)

### 10.2 Scheduling & Attendance
- Weekly recurring schedules
- Class session generation
- Teacher/Assistant permission checks
- Bulk and quick attendance marking
- Session attendance validation (can only mark on session day)
- Attendance modification request workflow for past sessions

### 10.3 Attendance Modification Request
- Teacher can request modification for past sessions (after 2 days deadline)
- Request includes: current status, requested status, reason
- Admin reviews and approves/rejects
- If approved, attendance record is automatically updated

### 10.4 Invoice Lock
- Admin can lock invoice editing by month
- Once locked, no new invoices can be created for that month
- Existing invoices cannot be modified or cancelled
- Unlock available for corrections if needed

### 10.5 Academic Management
- Assignment creation with due dates
- File submission handling
- Late submission penalty
- Grade calculation

### 10.6 Financial Operations
- Per-class tuition calculation
- Individual and family invoices
- VNPay integration
- Automated payment reminders
- Overdue invoice management
- Full refund workflow

### 10.7 Student Self-Enrollment
- Existing students can request to enroll in classes
- Admin reviews and approves/rejects

### 10.8 Center Profile
- Custom branding (logo, tagline, colors)
- Hero images with CTA buttons
- Gallery management
- Highlight features display

### 10.9 Notifications
- Role-based filtering
- In-app notifications
- Email notifications
- Zalo OA (SMS-style)
- Payment reminders

---

## Appendix: Controllers List (Actual from Code)

```
BE/EducenAPI/Controllers/
├── AuthController.cs              # Authentication
├── TenantsController.cs           # Tenant management
├── SubscriptionController.cs      # Subscription management
├── CenterSubscriptionController.cs # Center subscription
├── StudentsController.cs          # Student management
├── ParentsController.cs           # Parent management
├── TeachersController.cs          # Teacher management
├── AssistantsController.cs        # Assistant management
├── ClassesController.cs           # Class management
├── SubjectsController.cs          # Subject management
├── SchedulesController.cs         # Schedule management
├── RoomsController.cs            # Room management
├── AttendanceController.cs        # Attendance + Modification Request
├── GradesController.cs            # Grade management
├── AssignmentsController.cs       # Assignment management
├── SubmissionController.cs        # Submission management
├── TuitionController.cs           # Tuition + Invoice + Lock
├── FamilyInvoiceController.cs    # Family invoice
├── PaymentsController.cs          # Payment + VNPay
├── RefundsController.cs           # Refund management
├── NotificationsController.cs     # Notifications
├── SupportRequestsController.cs   # Support tickets
├── EnrollmentRequestsController.cs # Enrollment + Student self-enroll
├── TeacherReportController.cs     # Teacher reports
├── ZaloOAMessageController.cs     # Zalo OA messages
├── ZaloOAConfigController.cs      # Zalo OA config
├── TenantRegistrController.cs    # Tenant registration
├── AdminController.cs             # Admin operations
├── ProfileController.cs          # User profile
├── MaterialsController.cs         # Lesson materials
├── AdminSupportRequestsController.cs # Admin support requests
├── CenterHomeController.cs        # Center home page
├── RevenueReportsController.cs    # Revenue reports
├── PlansController.cs             # Subscription plans
├── CenterDashboardController.cs   # Center dashboard
├── AdminDashboardController.cs    # Admin dashboard
└── InvoiceGenerationController.cs # Invoice generation
```

---

## Appendix: New Models from Code

```
BE/EducenAPI/Models/
├── AttendanceModificationRequest.cs  # Attendance modification request
├── InvoiceLock.cs                    # Invoice lock by month
├── CenterProfile.cs                 # Center profile page
├── CenterImage.cs                   # Center gallery images
├── CenterHighlight.cs               # Center highlight features
├── CenterHeroImage.cs               # Center hero images
├── ResourceFile.cs                  # File management
├── SystemAdmin.cs                   # System admin account
└── TenantRegistration.cs            # Tenant registration request
```

---

*Document generated for Educen-SEP490 Project Analysis*
*Last updated: Based on actual codebase analysis*
