/**
 * Centralized Search Registry for HRMS Universal Smart Search.
 * Every searchable module, page, sub-tab, action, report, or setting is registered here.
 * To make any future module searchable, simply add a registry item object to this list.
 */

export const SEARCH_REGISTRY = [
    // ─────────────────────────────────────────────
    // NAVIGATION (PRIMARY PAGES & MODULES)
    // ─────────────────────────────────────────────
    {
        id: "nav_dashboard",
        title: "Dashboard",
        description: "Main overview dashboard, activity widgets & quick stats",
        keywords: ["dashboard", "overview", "home", "main", "stats", "analytics", "widgets"],
        category: "Navigation",
        route: "/dashboard",
        permissionKey: "dashboard",
        iconName: "LayoutDashboard"
    },
    {
        id: "nav_me",
        title: "Me (Personal Profile)",
        description: "Personal employee profile, contact details, skills & settings",
        keywords: ["me", "profile", "my profile", "personal", "user profile", "account", "my details"],
        category: "Navigation",
        route: "/me",
        permissionKey: "me",
        iconName: "User"
    },
    {
        id: "nav_my_team",
        title: "My Team",
        description: "Direct reports directory, team attendance & leave status",
        keywords: ["team", "my team", "manager", "direct reports", "subordinates", "reporting", "org chart"],
        category: "Navigation",
        route: "/my-team",
        permissionKey: "myTeam",
        iconName: "Users"
    },
    {
        id: "tab_team_members",
        title: "Team Members List",
        description: "View complete directory of direct reports and team members",
        keywords: ["team members", "team list", "reports list", "team directory"],
        category: "Navigation",
        route: "/my-team",
        state: { activeTab: "Team Members" },
        permissionKey: "myTeam",
        iconName: "UserCheck"
    },
    {
        id: "tab_team_attendance",
        title: "Team Attendance",
        description: "View check-in logs, clock times & daily attendance of team members",
        keywords: ["team attendance", "team checkin", "clock in", "team clock", "subordinate attendance"],
        category: "Navigation",
        route: "/my-team",
        state: { activeTab: "Team Attendance" },
        permissionKey: "myTeam",
        iconName: "Clock"
    },
    {
        id: "tab_leave_balance",
        title: "Leave Balance & Leaves",
        description: "View remaining paid leaves, casual & sick quota",
        keywords: ["leave balance", "remaining leaves", "casual leave balance", "sick leave quota"],
        category: "Navigation",
        route: "/me",
        state: { activeTab: "Leave" },
        permissionKey: "me",
        iconName: "Umbrella"
    },
    {
        id: "tab_team_leaves",
        title: "Team Leaves",
        description: "View and review leave applications & absence logs of team members",
        keywords: ["team leaves", "team leave requests", "vacation approval", "absence logs"],
        category: "Navigation",
        route: "/my-team",
        state: { activeTab: "Team Leaves" },
        permissionKey: "myTeam",
        iconName: "Umbrella"
    },
    {
        id: "tab_team_performance",
        title: "Team Performance Reviews",
        description: "Quarterly ratings, performance reviews & evaluation scores",
        keywords: ["team performance", "performance reviews", "ratings", "evaluations", "quarterly review"],
        category: "Navigation",
        route: "/my-team",
        state: { activeTab: "Team Performance" },
        permissionKey: "myTeam",
        iconName: "Award"
    },
    {
        id: "nav_employees",
        title: "Employees Directory",
        description: "Manage workforce accounts, employee records & organizational roles",
        keywords: ["employees", "directory", "workforce", "employee list", "staff", "people", "accounts"],
        category: "Navigation",
        route: "/employees",
        permissionKey: "employees",
        roles: ["global_admin", "admin", "hr"],
        iconName: "Users"
    },
    {
        id: "nav_my_finances",
        title: "My Finances",
        description: "View salary slips, tax breakdown, earnings & bank account details",
        keywords: ["finances", "my finances", "salary", "paystub", "payslip", "bank", "tax", "compensation", "payout"],
        category: "Navigation",
        route: "/my-finances",
        permissionKey: "myFinances",
        iconName: "CreditCard"
    },
    {
        id: "nav_documents",
        title: "Documents Library",
        description: "Official company policies & confidential employee documents repository",
        keywords: ["documents", "files", "policies", "paperwork", "company docs", "records", "handbook"],
        category: "Navigation",
        route: "/documents",
        permissionKey: "documents",
        iconName: "FileText"
    },
    {
        id: "nav_time_attendance",
        title: "Time & Attendance",
        description: "Attendance check-ins, shift schedules, leave management & holidays",
        keywords: ["time", "attendance", "clock in", "clock out", "leaves", "holidays", "shifts", "presence"],
        category: "Navigation",
        route: "/time-attendance",
        permissionKey: "timeAndAttend",
        iconName: "Clock"
    },
    {
        id: "nav_payroll",
        title: "Payroll Module",
        description: "Workforce salary calculations, deductions & payout registers",
        keywords: ["payroll", "salary calculation", "payouts", "wages", "disbursement", "payroll register"],
        category: "Navigation",
        route: "/payroll",
        permissionKey: "payroll",
        roles: ["global_admin", "admin", "hr"],
        iconName: "DollarSign"
    },
    {
        id: "nav_offboarding_onboarding",
        title: "Offboarding & Onboarding",
        description: "New joiner onboarding checklists & employee exit clearance workflows",
        keywords: ["offboarding", "onboarding", "exit", "joining", "resignation", "clearance", "joiners"],
        category: "Navigation",
        route: "/offboarding-onboarding",
        permissionKey: "offboardingAndOnboarding",
        roles: ["global_admin", "admin", "hr"],
        iconName: "UserCheck"
    },
    {
        id: "nav_organization",
        title: "Organization Structure",
        description: "Company departments, designations, company policy & roles matrix",
        keywords: ["organization", "departments", "designations", "hierarchy", "units", "structure", "company policy"],
        category: "Navigation",
        route: "/organization",
        permissionKey: "organization",
        iconName: "Building2"
    },
    {
        id: "org_departments",
        title: "Departments List",
        description: "View and manage company departments & division units",
        keywords: ["departments", "department list", "engineering", "sales", "hr department", "units"],
        category: "Navigation",
        route: "/organization",
        state: { activeTab: "Departments" },
        permissionKey: "organization",
        iconName: "Building"
    },
    {
        id: "org_designations",
        title: "Designations",
        description: "View and manage job roles & official employee titles",
        keywords: ["designations", "job titles", "positions", "roles", "job designations"],
        category: "Navigation",
        route: "/organization",
        state: { activeTab: "Designations" },
        permissionKey: "organization",
        iconName: "Briefcase"
    },
    {
        id: "tab_shift_schedule",
        title: "Shift Schedule",
        description: "Work shift timings, roster schedule & timing parameters",
        keywords: ["shift", "shift schedule", "work hours", "roster", "timings", "shift timings"],
        category: "Navigation",
        route: "/time-attendance",
        state: { activeTab: "Shift" },
        permissionKey: "timeAndAttend",
        iconName: "Calendar"
    },

    // ─────────────────────────────────────────────
    // ACTIONS (QUICK MODALS, DRAWERS & CREATION)
    // ─────────────────────────────────────────────
    {
        id: "act_add_employee",
        title: "Add Employee",
        description: "Create and register a new employee account in HRMS",
        keywords: ["add employee", "new employee", "create employee", "hire", "register employee", "add user", "create user"],
        category: "Actions",
        route: "/employees",
        state: { openDrawer: "add" },
        permissionKey: "employees",
        roles: ["global_admin", "admin", "hr"],
        iconName: "UserPlus"
    },
    {
        id: "act_apply_leave",
        title: "Apply Leave",
        description: "Submit a new leave application request for manager approval",
        keywords: ["apply leave", "take leave", "request leave", "vacation request", "sick leave", "casual leave", "apply time off"],
        category: "Actions",
        route: "/me",
        state: { activeTab: "Leave", openApplyLeaveModal: true },
        permissionKey: "me",
        iconName: "CalendarPlus"
    },
    {
        id: "act_clock_in",
        title: "Clock In / Punch Attendance",
        description: "Record daily attendance check-in time and work mode",
        keywords: ["clock in", "punch in", "check in", "mark attendance", "wfh clock in", "office punch"],
        category: "Actions",
        route: "/time-attendance",
        state: { activeTab: "Dashboard", openClockModal: true },
        permissionKey: "timeAndAttend",
        iconName: "LogIn"
    },
    {
        id: "act_create_holiday",
        title: "Create Holiday",
        description: "Add a new official holiday to company calendar",
        keywords: ["create holiday", "add holiday", "new holiday", "festival setup", "holiday calendar"],
        category: "Actions",
        route: "/dashboard",
        state: { openCreateHolidayModal: true },
        permissionKey: "dashboard",
        roles: ["global_admin", "admin", "hr"],
        iconName: "CalendarPlus"
    },
    {
        id: "act_upload_document",
        title: "Upload Document",
        description: "Upload new company policy handbook or employee file",
        keywords: ["upload document", "add document", "upload file", "add policy", "new document"],
        category: "Actions",
        route: "/documents",
        state: { openUploadModal: true },
        permissionKey: "documents",
        roles: ["global_admin", "admin", "hr"],
        iconName: "Upload"
    },
    {
        id: "act_create_department",
        title: "Add Department",
        description: "Create a new organizational department unit",
        keywords: ["add department", "create department", "new department", "new dept"],
        category: "Actions",
        route: "/organization",
        state: { activeTab: "Departments", openAddDepartment: true },
        permissionKey: "organization",
        roles: ["global_admin", "admin", "hr"],
        iconName: "Building2"
    },

    // ─────────────────────────────────────────────
    // DOCUMENTS (DOCUMENT TABS & POLICIES)
    // ─────────────────────────────────────────────
    {
        id: "doc_company_documents",
        title: "Company Documents & Policies",
        description: "Official handbooks, compliance policies & company notices",
        keywords: ["company documents", "handbook", "policy", "company policy", "notices", "guidelines", "compliance"],
        category: "Documents",
        route: "/documents",
        state: { activeTab: "company" },
        permissionKey: "documents",
        iconName: "Building"
    },
    {
        id: "doc_employee_documents",
        title: "Employee Documents",
        description: "Confidential employee record folders, ID proofs & file uploads",
        keywords: ["employee documents", "personal docs", "private files", "aadhaar", "pan", "passport", "contracts"],
        category: "Documents",
        route: "/documents",
        state: { activeTab: "employee" },
        permissionKey: "documents",
        roles: ["global_admin", "admin", "hr"],
        iconName: "Folder"
    },
    {
        id: "doc_company_policy",
        title: "Company Policy Handbook",
        description: "Company rules, leave policies, work hours & workplace guidelines",
        keywords: ["company policy", "rules", "leave policy", "workplace policy", "guidelines", "code of conduct"],
        category: "Documents",
        route: "/organization",
        state: { activeTab: "Company Policy" },
        permissionKey: "organization",
        iconName: "BookOpen"
    },

    // ─────────────────────────────────────────────
    // REPORTS (ANALYTICS & SUMMARY REPORTS)
    // ─────────────────────────────────────────────
    {
        id: "rep_attendance_report",
        title: "Attendance Report",
        description: "Daily clock-in summary, late arrivals & working hours report",
        keywords: ["attendance report", "clock in report", "working hours report", "log summary", "presence report"],
        category: "Reports",
        route: "/time-attendance",
        state: { activeTab: "Dashboard" },
        permissionKey: "timeAndAttend",
        iconName: "BarChart2"
    },
    {
        id: "rep_leave_report",
        title: "Leave Utilization Report",
        description: "Annual and monthly leave utilization analysis & pending requests",
        keywords: ["leave report", "absence report", "leave stats", "leave audit", "vacation report"],
        category: "Reports",
        route: "/me",
        state: { activeTab: "Leave" },
        permissionKey: "me",
        iconName: "PieChart"
    },
    {
        id: "rep_salary_slips",
        title: "Salary Slips & Payslips",
        description: "Download and view monthly employee salary slips",
        keywords: ["salary slips", "payslips", "paystub", "download payslip", "salary slip", "tax slip"],
        category: "Reports",
        route: "/my-finances",
        permissionKey: "myFinances",
        iconName: "Receipt"
    },
    {
        id: "rep_payroll_report",
        title: "Payroll Summary Register",
        description: "Monthly payroll breakdown, tax deductions & payout summary",
        keywords: ["payroll report", "salary report", "payout summary", "payroll register"],
        category: "Reports",
        route: "/payroll",
        permissionKey: "payroll",
        roles: ["global_admin", "admin", "hr"],
        iconName: "FileSpreadsheet"
    },

    // ─────────────────────────────────────────────
    // SETTINGS (SYSTEM CONFIGURATION & ACCESS CONTROL)
    // ─────────────────────────────────────────────
    {
        id: "set_roles_permissions",
        title: "Roles & Permissions",
        description: "Configure system role access and HR module permission matrix",
        keywords: ["roles", "permissions", "access control", "role management", "global admin access", "hr permissions"],
        category: "Settings",
        route: "/organization",
        state: { activeTab: "Roles & Permissions" },
        permissionKey: "organization",
        roles: ["global_admin", "admin", "hr"],
        iconName: "Shield"
    },
    {
        id: "set_profile_settings",
        title: "Profile & Account Settings",
        description: "Manage password, profile picture & personal account settings",
        keywords: ["profile settings", "account settings", "password", "security", "change password"],
        category: "Settings",
        route: "/me",
        permissionKey: "me",
        iconName: "Settings"
    }
];

/**
 * Filter registry items according to logged-in user's role and permission matrix.
 */
export const filterRegistryForUser = (user, canAccessRoute) => {
    if (!user) return [];

    const userRole = (user.role || "").toLowerCase();
    const isGlobalAdmin = userRole === "global_admin" || userRole === "admin";

    return SEARCH_REGISTRY.filter(item => {
        // Global Admins bypass all restriction checks
        if (isGlobalAdmin) return true;

        // Check role restriction if specified
        if (item.roles && Array.isArray(item.roles) && item.roles.length > 0) {
            if (!item.roles.includes(userRole)) return false;
        }

        // Check module permission key if user.permissions exists
        if (item.permissionKey && user.permissions) {
            if (user.permissions[item.permissionKey] === false) return false;
        }

        // Check route protection access
        if (canAccessRoute && item.route) {
            if (!canAccessRoute(item.route)) return false;
        }

        return true;
    });
};
