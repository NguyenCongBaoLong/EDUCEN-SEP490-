# Educen-SEP490 Specification

## Project Overview
- **Project Name**: Educen - Education Management System
- **Type**: Multi-tenant SaaS Web Application
- **Core Functionality**: Comprehensive education center management platform supporting student enrollment, class scheduling, attendance tracking, grade management, assignment submission, tuition invoicing, and payment processing
- **Target Users**: Education centers, teachers, assistants, students, and parents

## Architecture

### Backend
- **Framework**: ASP.NET Core 8.0
- **Database**: Entity Framework Core with multi-tenant isolation
- **Authentication**: JWT-based with role-based access control

### Frontend
- **Framework**: React 19 + Vite
- **Routing**: React Router DOM
- **State**: React Hot Toast for notifications
- **Charts**: Recharts

## User Roles

| Role | Description |
|------|-------------|
| SystemAdmin | Global platform administrator |
| CenterAdmin | Individual center administrator |
| Teacher | Instructional staff |
| Assistant | Classroom assistant |
| Student | Enrolled learner |
| Parent | Student guardian |

## Domain Models

### Core Entities
- `Tenant` - Education center (multi-tenant isolation)
- `User` - Authentication and user management
- `Role` - User roles and permissions
- `Student` - Enrolled student records
- `Parent` - Student guardians
- `Teacher` - Instructional staff
- `Assistant` - Classroom support staff
- `Class` - Course offerings
- `Subject` - Academic subjects
- `Schedule` - Class schedules
- `Room` - Physical/virtual classroom resources
- `Attendance` - Student attendance records
- `Grade` - Academic performance
- `Assignment` - Homework and assessments
- `Submission` - Student submissions
- `EnrollmentRequest` - Student enrollment applications

### Financial Entities
- `Subscription` - Center subscription plans
- `Plan` - Subscription tier definitions
- `TenantContract` - Contract terms
- `TuitionInvoice` - Invoice records
- `TuitionInvoiceItem` - Individual invoice line items
- `FamilyInvoice` - Parent-facing consolidated invoice
- `PaymentTransaction` - Payment records
- `PaymentRecord` - Payment details
- `RefundRequest` - Refund applications

### Communication Entities
- `Notification` - In-app notifications
- `SupportRequest` - Help desk tickets
- `LessonMaterial` - Educational resources

### Integration Entities
- `TenantZaloOAConfig` - Zalo Official Account configuration
- `TenantPaymentGatewayConfig` - Payment gateway settings
- `TenantCreditLedger` - Credit system tracking

## API Endpoints

### Authentication
- `/api/auth/login` - User login
- `/api/auth/signup` - Registration
- `/api/auth/forgot-password` - Password recovery
- `/api/auth/reset-password` - Password reset

### Tenants
- `/api/tenants` - Center management
- `/api/tenants/reg` - Tenant registration
- `/api/subscriptions` - Subscription management
- `/api/plans` - Plan definitions

### Users
- `/api/users/profile` - User profile
- `/api/students` - Student CRUD
- `/api/parents` - Parent CRUD
- `/api/teachers` - Teacher CRUD
- `/api/assistants` - Assistant CRUD
- `/api/admin` - Admin operations
- `/api/center-home` - Center home page

### Academics
- `/api/classes` - Class management
- `/api/subjects` - Subject management
- `/api/schedules` - Schedule management
- `/api/rooms` - Room management
- `/api/attendance` - Attendance tracking
- `/api/grades` - Grade management
- `/api/assignments` - Assignment management
- `/api/submissions` - Submission management
- `/api/teacher-report` - Teacher performance reports

### Finance
- `/api/tuition` - Tuition calculation
- `/api/family-invoice` - Family invoicing
- `/api/payments` - Payment processing
- `/api/refunds` - Refund requests
- `/api/revenue-reports` - Financial reports
- `/api/center-dashboard` - Center analytics

### Communication
- `/api/notifications` - Notification management
- `/api/support-requests` - Support tickets
- `/api/materials` - Lesson materials

## Key Features

### Multi-tenancy
- Tenant isolation via middleware
- Per-tenant database schema
- Tenant-specific configuration

### Scheduling & Attendance
- Weekly class schedules
- Student/teacher schedule views
- Attendance marking and reporting

### Academic Management
- Assignment creation and grading
- Late submission handling
- Lesson material distribution
- Performance reporting

### Financial Operations
- Tuition calculation per class
- Invoice generation (individual/family)
- Payment processing (VNPay integration)
- Automated payment reminders
- Overdue invoice management
- Refund processing

### Notifications
- In-app notifications
- Role-based notification filtering
- Zalo OA integration for SMS
- Batch reminder scheduling

### Subscription System
- Multiple subscription tiers
- Credit-based usage model
- Subscription expiration monitoring
- Plan management (System Admin)

## Technology Stack

### Backend Dependencies
- Microsoft.EntityFrameworkCore
- Microsoft.IdentityModel.Tokens
- System.IdentityModel.Tokens.Jwt

### Frontend Dependencies
- react: ^19.2.0
- react-router-dom: ^7.13.0
- axios: ^1.13.4
- recharts: ^3.7.0
- lucide-react: ^0.563.0
- react-hot-toast: ^2.6.0

## Project Structure

```
EDUCEN-SEP490-/
├── BE/
│   └── EducenAPI/
│       ├── Controllers/     # API endpoints
│       ├── Models/        # Entity models
│       ├── Services/       # Business logic
│       ├── DTOs/          # Data transfer objects
│       ├── Middleware/    # Custom middleware
│       ├── Mappings/     # AutoMapper profiles
│       ├── Persistence/  # EF Core configuration
│       └── Validators/   # Input validation
├── frontend/
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── services/   # API client services
│   │   └── App.jsx     # Main application
│   └── package.json
└── SPEC.md
```