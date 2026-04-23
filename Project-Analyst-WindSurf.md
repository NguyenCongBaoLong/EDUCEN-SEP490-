# Project Analysis Report - Educen Education Management System

**Date:** April 23, 2026  
**Project Name:** Educen - Education Management System  
**Type:** Multi-tenant SaaS Web Application  

---

## 1. Executive Summary

Educen is a comprehensive education center management platform built as a multi-tenant SaaS application. The system enables education centers to manage students, classes, schedules, attendance, grades, assignments, tuition invoicing, and payments through a unified web-based interface. The platform supports multiple user roles including System Admin, Tenant Admin, Teachers, Assistants, Students, and Parents, each with appropriate permissions and features.

**Key Strengths:**
- Multi-tenant architecture with data isolation
- Comprehensive feature set covering all education center operations
- Modern technology stack (ASP.NET Core 8.0 + React 19)
- Integration with payment gateway (VNPay) and communication channels (Zalo OA)
- Vietnamese language support with proper encoding

**Current Status:**
- Backend: Fully functional with 38 API controllers and 94 services
- Frontend: Complete with 51 pages across 7 user role sections
- Database: Multi-tenant design with AdminDB and per-tenant databases
- Vietnamese encoding issues have been resolved in frontend

---

## 2. System Architecture

### 2.1 Architecture Pattern

The system follows a **multi-tenant SaaS architecture** with:

- **Shared Application Layer**: Single ASP.NET Core API instance serving all tenants
- **Isolated Data Layer**: Separate database schemas per tenant
- **Tenant Identification**: Via subdomain or tenant ID header
- **Role-Based Access Control (RBAC)**: 7 distinct user roles with granular permissions

### 2.2 Technology Stack

#### Backend
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | ASP.NET Core | 8.0 |
| ORM | Entity Framework Core | Latest |
| Database | SQL Server | Multi-tenant |
| Authentication | JWT Bearer Tokens | - |
| API Documentation | Swagger/OpenAPI | - |
| Dependency Injection | Built-in DI Container | - |
| Background Services | Hosted Services | - |

#### Frontend
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React | 19.2.0 |
| Build Tool | Vite | 7.2.4 |
| Routing | React Router DOM | 7.13.0 |
| State Management | React Context | - |
| HTTP Client | Axios | 1.13.4 |
| Notifications | React Hot Toast | 2.6.0 |
| Charts | Recharts | 3.7.0 |
| Icons | Lucide React | 0.563.0 |

#### External Integrations
| Service | Purpose |
|---------|---------|
| VNPay Gateway | Payment processing |
| Zalo Official Account | Notifications and messaging |
| Email Service | User communications |

### 2.3 Project Structure

```
EDUCEN-SEP490-/
├── BE/EducenAPI/                          # Backend API
│   ├── Controllers/                       # 38 API controllers
│   │   ├── AdminDashboardController.cs
│   │   ├── AttendanceController.cs
│   │   ├── ClassesController.cs
│   │   ├── StudentsController.cs
│   │   ├── TuitionController.cs
│   │   └── ... (35 more)
│   ├── Services/                          # 94 business services
│   │   ├── AuthService.cs
│   │   ├── ClassService.cs
│   │   ├── AttendanceService.cs
│   │   ├── Payment/                       # Payment services
│   │   ├── BackgroundServices/            # Hosted services
│   │   └── ... (90 more)
│   ├── Models/                            # 49 entity models
│   │   ├── Student.cs
│   │   ├── Class.cs
│   │   ├── Tenant.cs
│   │   ├── PaymentModels.cs
│   │   └── ... (45 more)
│   ├── DTOs/                              # 78 data transfer objects
│   ├── Persistence/                        # EF Core configuration
│   │   ├── Contexts/
│   │   │   ├── AdminDbContext.cs
│   │   │   └── TenantDbContext.cs
│   │   └── Migrations/
│   ├── Middleware/                        # Custom middleware
│   ├── Exceptions/                        # Custom exceptions
│   └── Program.cs                        # Application entry point
├── frontend/                             # React frontend
│   ├── src/
│   │   ├── pages/                        # 51 page components
│   │   │   ├── center/                   # 19 admin pages
│   │   │   ├── teacher/                  # 8 teacher pages
│   │   │   ├── student/                  # 5 student pages
│   │   │   ├── parent/                   # 4 parent pages
│   │   │   ├── sysadmin/                 # 5 system admin pages
│   │   │   ├── auth/                     # 5 auth pages
│   │   │   └── assistant/                # 1 assistant page
│   │   ├── services/                     # API client services
│   │   ├── components/                   # 44 reusable components
│   │   ├── context/                      # React contexts
│   │   ├── css/                          # 71 CSS files
│   │   └── App.jsx                       # Main app component
│   ├── package.json
│   └── vite.config.js
└── Project-Analysis.md                    # Existing documentation
```

---

## 3. Database Design

### 3.1 Multi-Tenant Architecture

The system uses a **database-per-tenant** pattern:

- **AdminDB**: Stores platform-wide data
  - Tenants
  - Plans (subscription tiers)
  - Subscriptions
  - TenantRegistrations
  - SystemAdmin accounts
  - PackageChangeRequests
  - Contracts
  - RefundRequests
  - TenantCreditLedger

- **Tenant DBs**: Each tenant has isolated database for:
  - Users (with tenant-scoped roles)
  - Students
  - Parents
  - Teachers
  - Assistants
  - Classes
  - Subjects
  - Schedules
  - Rooms
  - Attendance records
  - Grades
  - Assignments
  - Submissions
  - Tuition invoices
  - Family invoices
  - Payment records
  - Notifications
  - Support requests
  - Center profile data
  - Integration configurations (Zalo OA, Payment gateway)

### 3.2 Key Entity Relationships

**Plan ↔ PackageChangeRequest (2 connections):**
- `CurrentPackageRequests`: Requests where this plan is the current plan (being changed from)
- `RequestedPackageRequests`: Requests where this plan is the requested plan (being changed to)

This design allows tracking plan changes in both directions:
- See how many users want to change FROM a plan
- See how many users want to change TO a plan

**Other Important Relationships:**
- Tenant → Users (one-to-many, tenant-scoped)
- Class → Students (many-to-many via enrollment)
- Class → Schedule (one-to-many)
- Schedule → ClassSession (one-to-many)
- ClassSession → Attendance (one-to-many)
- Assignment → Submissions (one-to-many)
- Student → TuitionInvoice (one-to-many)
- Parent → FamilyInvoice (one-to-many)

---

## 4. User Roles and Permissions

| Role | Description | Key Permissions |
|------|------------|-----------------|
| **SystemAdmin** | Platform administrator | Manage all tenants, plans, subscriptions, system-wide settings, refund approvals |
| **TenantAdmin** | Center administrator | Manage tenant operations, users, classes, finances (tenant-scoped) |
| **Admin** | Center administrator (legacy) | Same as TenantAdmin |
| **Teacher** | Instructional staff | Manage classes, attendance, grades, assignments, materials, schedule change requests |
| **Assistant** | Classroom support | Support teaching, attendance, classroom management |
| **Student** | Enrolled learner | View grades, submit assignments, view schedule, make payments, view invoices |
| **Parent** | Student guardian | View student progress, make payments, view family invoices, receive notifications |

---

## 5. Core Features

### 5.1 Authentication & Authorization
- JWT-based authentication with secure token generation
- Role-based access control enforcement
- Password reset via email
- Multi-factor support via tenant identification

### 5.2 Tenant Management
- Tenant registration workflow
- SystemAdmin approval process
- Subscription plan management
- Credit system and quota tracking
- Tenant activation/deactivation

### 5.3 Student Management
- Student enrollment requests
- Self-enrollment for existing students
- Import students from Excel
- Student profile management
- Parent-student linking

### 5.4 Class Management
- Class CRUD operations
- Teacher assignment
- Subject and room assignment
- Student enrollment in classes
- Class capacity management

### 5.5 Schedule Management
- Weekly schedule configuration
- Recurring schedule setup
- Schedule change requests
- Conflict detection
- Teacher availability checking

### 5.6 Attendance Management
- Bulk attendance marking
- Quick attendance (mark all present)
- Individual attendance updates
- Attendance modification requests (for past sessions)
- Admin approval workflow for modifications
- Attendance reporting

### 5.7 Assignment & Grade Management
- Assignment creation with due dates
- File upload support
- Student submission tracking
- Late submission handling
- Grade recording and publishing
- Performance reporting

### 5.8 Tuition & Invoice Management
- Tuition calculation per class
- Individual invoice generation
- Family invoice consolidation
- Invoice locking by month (prevent editing after deadline)
- Batch invoice creation
- E-invoice support (Sandbox mode)

### 5.9 Payment Processing
- VNPay integration
- Payment creation and callback handling
- Transaction verification
- Cash payment at center
- Payment confirmation workflow
- Payment reminders

### 5.10 Refund Management
- Refund request creation
- Admin approval workflow
- VNPay refund processing
- Credit-based refunds
- Status tracking

### 5.11 Communication
- In-app notifications
- Email notifications
- Zalo OA integration
- Support ticket system
- Payment reminders (single/batch)

### 5.12 Center Profile Management
- Custom branding (logo, colors)
- Hero images with call-to-action
- Gallery management
- Highlight features
- Staff showcase

---

## 6. API Structure

### 6.1 Controller Categories

**Authentication & User Management:**
- `AuthController.cs` - Login, registration, password reset
- `ProfileController.cs` - User profile management
- `StudentsController.cs` - Student CRUD
- `ParentsController.cs` - Parent management
- `TeachersController.cs` - Teacher management
- `AssistantsController.cs` - Assistant management

**Academic Management:**
- `ClassesController.cs` - Class operations
- `SubjectsController.cs` - Subject management
- `SchedulesController.cs` - Schedule operations
- `RoomsController.cs` - Room management
- `AttendanceController.cs` - Attendance operations
- `AssignmentsController.cs` - Assignment management
- `SubmissionController.cs` - Submission handling
- `GradesController.cs` - Grade management
- `MaterialsController.cs` - Lesson materials

**Enrollment:**
- `EnrollmentRequestsController.cs` - Enrollment requests

**Financial:**
- `TuitionController.cs` - Tuition management
- `InvoiceGenerationController.cs` - Invoice generation
- `FamilyInvoiceController.cs` - Family invoices
- `PaymentsController.cs` - Payment operations
- `RefundsController.cs` - Refund management
- `RevenueReportsController.cs` - Revenue reporting

**Tenant & Subscription:**
- `TenantsController.cs` - Tenant operations
- `TenantRegistrationsController.cs` - Registration requests
- `PlansController.cs` - Plan management
- `SubscriptionController.cs` - Subscription operations
- `CenterSubscriptionController.cs` - Center subscriptions

**Communication:**
- `NotificationsController.cs` - Notification management
- `SupportRequestsController.cs` - Support tickets
- `ZaloOAConfigController.cs` - Zalo OA configuration
- `ZaloOAMessageController.cs` - Zalo messaging

**Admin & Reporting:**
- `AdminController.cs` - Admin operations
- `AdminDashboardController.cs` - Admin dashboard
- `AdminReportController.cs` - Admin reports
- `AdminSupportRequestsController.cs` - Admin support management
- `CenterDashboardController.cs` - Center dashboard
- `CenterHomeController.cs` - Center home page
- `TeacherReportController.cs` - Teacher reports

### 6.2 Service Layer Architecture

The system uses a **service-oriented architecture** with:

- **94 service classes** implementing business logic
- **42 service interfaces** for dependency injection
- **Background services** for:
  - Subscription expiration monitoring
  - Credit deduction
  - Payment reminders
  - Notification processing

Key service categories:
- Authentication & Authorization
- Tenant Management
- Student & User Management
- Class & Schedule Management
- Attendance Management
- Assignment & Grade Management
- Invoice & Payment Processing
- Refund Processing
- Communication Services
- Reporting Services

---

## 7. Frontend Architecture

### 7.1 Page Structure by Role

**Center/Admin (19 pages):**
- AdminDashboard.jsx
- CenterHome.jsx
- StudentManagement.jsx
- TeacherManagement.jsx
- ParentManagement.jsx
- AssistantManagement.jsx
- ClassesManagement.jsx
- ClassDetail.jsx
- ScheduleManagement.jsx
- ScheduleRequests.jsx
- AttendanceModifications.jsx
- GradeManagement.jsx
- SubjectManagement.jsx
- RoomManagement.jsx
- TuitionManagement.jsx
- RevenueReport.jsx
- SubscriptionPlans.jsx
- StaffManagement.jsx
- UserProfile.jsx

**Teacher (8 pages):**
- TeacherSchedule.jsx
- TeacherClasses.jsx
- TeacherClassDetail.jsx
- TeacherAssignments.jsx
- AssignmentStatus.jsx
- AssignmentGrading.jsx
- TeacherPerformanceReport.jsx

**Student (5 pages):**
- StudentSchedule.jsx
- StudentClasses.jsx
- StudentClassDetail.jsx
- MyInvoices.jsx

**Parent (4 pages):**
- ParentSchedule.jsx
- ParentClasses.jsx
- FamilyInvoices.jsx

**System Admin (5 pages):**
- TenantManagement.jsx
- PlansManagement.jsx
- RefundManagement.jsx
- ZaloOAConfig.jsx
- SystemAdminDashboard.jsx

**Auth (5 pages):**
- Login.jsx
- Signup.jsx
- ForgotPassword.jsx
- ResetPassword.jsx
- SystemAdminLogin.jsx

**Shared (1 page):**
- MailboxPage.jsx

**Public Pages:**
- HomePage.jsx
- Pricing.jsx
- PaymentResult.jsx

### 7.2 Component Structure

**44 Reusable Components:**
- Sidebar components for each role
- Modal components (ConfirmModal, EInvoiceModal)
- Form components
- Table components
- Chart components
- Notification components

### 7.3 State Management

- **React Context** for:
  - Authentication (AuthContext)
  - Schedule data (ScheduleContext)
  - Tenant identification

- **Local State** for:
  - Component-specific data
  - Form handling
  - UI state (modals, loading states)

### 7.4 API Integration

**12 Service Files:**
- `api.js` - Base axios configuration
- `authService.js` - Authentication API calls
- `tuitionService.js` - Tuition operations
- `familyInvoiceService.js` - Family invoice operations
- And 8 more service files for different domains

---

## 8. Security Implementation

### 8.1 Authentication
- JWT Bearer token authentication
- Secure token generation with expiration
- Refresh token support
- Password hashing with BCrypt

### 8.2 Authorization
- Role-based access control (RBAC)
- Middleware-based permission checking
- Tenant-scoped data access
- API-level authorization attributes

### 8.3 Data Security
- Multi-tenant data isolation
- SQL injection prevention (EF Core parameterized queries)
- XSS prevention (React's built-in escaping)
- CORS configuration
- Input validation with FluentValidation

### 8.4 API Security
- API Key authentication for system operations
- Tenant identification via header
- Rate limiting (via QuotaCheckAttribute)
- HTTPS enforcement in production

---

## 9. Deployment Architecture

### 9.1 Containerization
- Backend: Docker support with Dockerfile
- Frontend: Docker support with Dockerfile
- Docker Compose for multi-container setup

### 9.2 Deployment Strategy
- **Development**: Local development with hot reload
- **Production**: Containerized deployment
- **Database**: SQL Server with backup strategy
- **Static Assets**: Served via CDN or web server

### 9.3 Environment Configuration
- `.env.example` files for configuration templates
- Environment-specific settings (development, production)
- Secret management for sensitive data

---

## 10. Vietnamese Encoding Fixes

### 10.1 Completed Fixes
Vietnamese encoding issues have been resolved in the following frontend files:

1. **TuitionManagement.jsx** - Fixed garbled toast messages
2. **SubscriptionPlans.jsx** - Fixed garbled labels and status text
3. **MyInvoices.jsx** - Fixed extensive garbled text in comments, error messages, and UI
4. **FamilyInvoices.jsx** - Fixed garbled text in error messages and UI labels
5. **EInvoiceModal.jsx** - Fixed modal title and button text

### 10.2 Backend Encoding Configuration
The backend has UTF-8 encoding properly configured in `Program.cs`:
```csharp
System.Text.Encoding.RegisterProvider(System.Text.CodePagesEncodingProvider.Instance);
options.JsonSerializerOptions.Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping;
```

---

## 11. Key Workflows

### 11.1 Tenant Registration Flow
1. Guest submits registration request
2. SystemAdmin reviews and approves
3. Tenant database created
4. Subscription assigned
5. Tenant receives credentials

### 11.2 Student Enrollment Flow
1. Parent/guest submits enrollment request
2. Admin reviews and approves
3. Student account created
4. Credentials sent via email
5. Student can self-enroll in classes

### 11.3 Tuition & Payment Flow
1. Admin generates invoices for period
2. Invoices sent to parents/students
3. Payment created via VNPay or cash
4. Payment callback processed
5. Invoice marked as paid
6. E-invoice issued (Sandbox mode)

### 11.4 Attendance Flow
1. Teacher marks attendance for session
2. Can use bulk or quick marking
3. For past sessions, submit modification request
4. Admin reviews and approves modifications
5. Attendance records updated

---

## 12. Database Schema Analysis

### 12.1 AdminDB Schema
**Purpose:** Platform-wide data and multi-tenant management

**Key Tables:**
- `Tenants` - Education center information
- `Plans` - Subscription tier definitions
- `Subscriptions` - Active subscriptions
- `TenantRegistrations` - Registration requests
- `SystemAdmins` - Platform admin accounts
- `PackageChangeRequests` - Plan change requests
- `TenantContracts` - Legal contracts
- `RefundRequests` - Refund applications
- `TenantCreditLedger` - Credit tracking

**Relationships:**
- Tenant ↔ Subscription (one-to-many)
- Plan ↔ Subscription (one-to-many)
- Plan ↔ PackageChangeRequest (two relationships: CurrentPlan, RequestedPlan)
- Tenant ↔ PackageChangeRequest (one-to-many)

### 12.2 Tenant DB Schema
**Purpose:** Per-tenant education center data

**Key Tables:**
- `Users` - User accounts (tenant-scoped)
- `Students` - Student records
- `Parents` - Parent records
- `Teachers` - Teacher records
- `Assistants` - Assistant records
- `Classes` - Class offerings
- `Subjects` - Academic subjects
- `Schedules` - Weekly schedules
- `Rooms` - Classroom resources
- `ClassSessions` - Individual sessions
- `Attendance` - Attendance records
- `AttendanceModificationRequests` - Modification requests
- `Assignments` - Homework/assessments
- `Submissions` - Student submissions
- `Grades` - Academic grades
- `TuitionInvoices` - Individual invoices
- `TuitionInvoiceItems` - Invoice line items
- `FamilyInvoices` - Consolidated invoices
- `InvoiceLocks` - Month-based locks
- `PaymentRecords` - Payment records
- `Notifications` - In-app notifications
- `SupportRequests` - Help desk tickets
- `CenterProfile` - Center branding
- `CenterImages` - Gallery images
- `CenterStaff` - Staff showcase
- `TenantZaloOAConfig` - Zalo configuration
- `TenantPaymentGatewayConfig` - Payment gateway config

---

## 13. Performance Considerations

### 13.1 Backend Performance
- **Caching**: Memory cache for frequently accessed data
- **Database Indexing**: Proper indexes on foreign keys and search fields
- **Async Operations**: Async/await pattern for I/O operations
- **Background Services**: Offload long-running tasks to background services

### 13.2 Frontend Performance
- **Code Splitting**: Vite automatic code splitting
- **Lazy Loading**: Component lazy loading for large pages
- **Optimized Builds**: Production builds with minification
- **Asset Optimization**: Image optimization and CDN serving

### 13.3 Database Performance
- **Connection Pooling**: EF Core connection pooling
- **Query Optimization**: Efficient LINQ queries with proper includes
- **Indexing Strategy**: Strategic indexing for common queries
- **Partitioning**: Potential for data partitioning by tenant

---

## 14. Scalability Analysis

### 14.1 Horizontal Scaling
- **API Layer**: Stateless API allows horizontal scaling
- **Database**: Per-tenant databases allow distribution
- **Frontend**: Static assets can be served via CDN

### 14.2 Vertical Scaling
- **Background Services**: Can be scaled independently
- **Database**: Can be upgraded to larger instances
- **Caching**: Can add Redis for distributed caching

### 14.3 Multi-Tenant Scaling
- **Tenant Isolation**: Each tenant has separate database
- **Resource Quotas**: Quota system prevents resource abuse
- **Load Balancing**: Can distribute load across multiple API instances

---

## 15. Recommendations

### 15.1 Short-term Improvements
1. **Add Unit Tests**: Increase test coverage for critical services
2. **API Documentation**: Enhance Swagger documentation with examples
3. **Error Handling**: Implement global error handling with user-friendly messages
4. **Logging**: Add structured logging for debugging and monitoring
5. **Monitoring**: Implement application monitoring (APM)

### 15.2 Medium-term Improvements
1. **Redis Cache**: Add distributed caching for better performance
2. **Message Queue**: Implement message queue for background tasks
3. **Search**: Add Elasticsearch for advanced search capabilities
4. **Analytics**: Implement analytics dashboard for insights
5. **Mobile App**: Develop mobile applications for teachers and parents

### 15.3 Long-term Improvements
1. **Microservices**: Consider microservices architecture for specific domains
2. **Event-Driven**: Implement event-driven architecture for better scalability
3. **AI Features**: Add AI-powered features (grade prediction, attendance analytics)
4. **Integration Marketplace**: Create marketplace for third-party integrations
5. **White-labeling**: Enable full white-labeling for enterprise clients

---

## 16. Conclusion

Educen is a well-architected multi-tenant SaaS education management system with comprehensive features covering all aspects of education center operations. The system demonstrates:

- **Solid Architecture**: Multi-tenant design with proper data isolation
- **Modern Tech Stack**: Current technologies (ASP.NET Core 8.0, React 19)
- **Comprehensive Features**: Complete feature set for education management
- **Security Focus**: Proper authentication, authorization, and data security
- **Integration Ready**: Payment gateway and communication integrations
- **Vietnamese Support**: Proper encoding and localization

The system is production-ready with room for scalability and enhancement. The recent Vietnamese encoding fixes ensure proper language support for Vietnamese users.

---

## 17. Appendix

### 17.1 File Statistics
- **Backend**: 374 files in EducenAPI
- **Frontend**: 187 files in frontend/src
- **Controllers**: 38 API controllers
- **Services**: 94 business services
- **Models**: 49 entity models
- **DTOs**: 78 data transfer objects
- **Frontend Pages**: 51 page components
- **Frontend Components**: 44 reusable components

### 17.2 Code Quality Metrics
- **Separation of Concerns**: Clear separation between controllers, services, and data access
- **Dependency Injection**: Proper DI implementation throughout
- **Async Patterns**: Consistent use of async/await
- **Error Handling**: Structured exception handling
- **Validation**: Input validation at multiple layers

### 17.3 Technology Debt
- Limited unit test coverage
- Some legacy code (Admin vs TenantAdmin roles)
- Manual deployment process (can be automated)
- Limited monitoring and alerting

---

**Report Generated By:** Cascade AI Assistant  
**Analysis Date:** April 23, 2026  
**System Version:** Current production version
