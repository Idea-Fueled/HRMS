import mongoose from "mongoose";

const userScehma = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    biometricEnrollNumber: {
        type: String,
        trim: true,
        default: null
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: false,
        trim: true,
        default: ""
    },
    fullName: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    profilePicture: {
        type: String,
        default: ""
    },
    role: {
        type: String,
        enum: ["global_admin", "admin", "hr", "manager", "employee", "intern", "management"],
        default: "employee"
    },
    visibleEmployees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    department: {
        type: String,
        required: true
    },
    designation: {
        type: String,
        required: true
    },
    managerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    dottedManagerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    // Employement information
    employementType: {
        type: String,
        enum: [
            "full_time",
            "part_time",
            "contract",
            "intern",
            "consultant"
        ],
        default: "full_time"
    },
    workLocation: {
        type: String,
        default: "Office"
    },
    dateOfBirth: {
        type: Date
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"]
    },
    bloodGroup: {
        type: String
    },
    fatherName: {
        type: String,
        default: ""
    },
    emergencyContactNumber: {
        type: String
    },
    presentAddress: {
        type: String,
        default: ""
    },
    permanentAddress: {
        type: String,
        default: ""
    },
    aboutMe: {
        type: String,
        default: ""
    },
    skills: [{
        type: String
    }],
    interests: [{
        type: String
    }],
    emergencyContactName: {
        type: String,
        default: ""
    },
    emergencyContactRelation: {
        type: String,
        default: ""
    },
    maritalStatus: {
        type: String,
        default: "Single"
    },
    education: [{
        degree: String,
        institution: String,
        fieldOfStudy: String,
        passingYear: String,
        level: String
    }],
    experienceTimeline: [{
        title: String,
        company: String,
        period: String,
        description: String
    }],
    userDocuments: [{
        name: String,
        category: String,
        numberOrTag: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
        status: { type: String, default: "Verified" }
    }],
    assets: [{
        name: String,
        assetTag: String,
        category: String,
        issuedDate: { type: Date, default: Date.now },
        condition: { type: String, default: "Excellent" },
        status: { type: String, default: "Active" }
    }],
    activities: [{
        title: String,
        description: String,
        timestamp: { type: Date, default: Date.now },
        type: { type: String, default: "general" }
    }],

    // bank details
    companyEntity: {
        type: String,
        enum: ["Idea Fueled", "Idea Fueled LLP"],
        default: "Idea Fueled"
    },
    paymentMode: {
        type: String,
        default: "Bank Transfer"
    },
    bankName: {
        type: String,
        default: ""
    },

    accountHolderName: {
        type: String,
        default: ""
    },

    accountNumber: {
        type: String,
        default: ""
    },

    ifscCode: {
        type: String,
        default: ""
    },

    // identity information

    panNumber: {
        type: String,
        default: ""
    },

    aadhaarNumber: {
        type: String,
        default: ""
    },

    salaryStructure: {
        ctc: { type: Number, default: 0 },
        basic: { type: Number, default: 0 },
        hra: { type: Number, default: 0 },
        medicalAllowance: { type: Number, default: 0 },
        conveyanceAllowance: { type: Number, default: 0 },
        specialAllowance: { type: Number, default: 0 },
        otherAllowances: { type: Number, default: 0 }
    },

    //leave summary
    totalLeaves: {
        type: Number,
        default: 20
    },
    usedLeaves: {
        type: Number,
        default: 0
    },
    pendingLeaves: {
        type: Number,
        default: 0
    },
    leaveBalance: {
        sick: {
            total: { type: Number, default: 6 },
            used: { type: Number, default: 0 },
            pending: { type: Number, default: 0 }
        },
        casual: {
            total: { type: Number, default: 8 },
            used: { type: Number, default: 0 },
            pending: { type: Number, default: 0 }
        },
        earned: {
            total: { type: Number, default: 20 },
            used: { type: Number, default: 0 },
            pending: { type: Number, default: 0 }
        },
        compOff: {
            total: { type: Number, default: 0 },
            used: { type: Number, default: 0 },
            pending: { type: Number, default: 0 }
        },
        partial: {
            total: { type: Number, default: 1 },
            used: { type: Number, default: 0 },
            pending: { type: Number, default: 0 }
        }
    },

    // status
    status: {
        type: String,
        enum: [
            "active",
            "inactive",
            "on_notice",
            "terminated",
            "offboarding",
            "exited"
        ],
        default: "active"
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date
    },
    joiningDate: {
        type: Date,
        default: null
    },
    probationPeriod: {
        type: Number,
        default: 180 // duration in days
    },
    probationPolicy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProbationPolicy",
        default: null
    },
    permissions: {
        type: {
            dashboard: { type: Boolean, default: true },
            me: { type: Boolean, default: true },
            myTeam: { type: Boolean, default: true },
            myFinances: { type: Boolean, default: true },
            documents: {
                companyDocuments: { type: Boolean, default: true },
                employeeDocuments: { type: Boolean, default: false }
            },
            timeAndAttend: { type: Boolean, default: false },
            employees: { type: Boolean, default: false },
            payroll: { type: Boolean, default: false },
            recruitment: { type: Boolean, default: false },
            hire: { type: Boolean, default: false },
            offboardingAndOnboarding: { type: Boolean, default: false },
            organization: { type: Boolean, default: false },
            probation: { type: Boolean, default: false }
        },
        default: {
            dashboard: true,
            me: true,
            myTeam: true,
            myFinances: true,
            documents: {
                companyDocuments: true,
                employeeDocuments: false
            },
            timeAndAttend: false,
            employees: false,
            payroll: false,
            recruitment: false,
            hire: false,
            offboardingAndOnboarding: false,
            organization: false,
            probation: false
        }
    },
    preferences: {
        emailNotifications: {
            payslips: { type: Boolean, default: true },
            leaves: { type: Boolean, default: true },
            announcements: { type: Boolean, default: true },
            emails: { type: Boolean, default: true }
        },
        inAppAlerts: { type: Boolean, default: true },
        desktopNotifications: { type: Boolean, default: true },
        dateFormat: { type: String, default: "DD/MM/YYYY" },
        compactMode: { type: Boolean, default: false }
    }

},
    { timestamps: true }
)

const User = mongoose.model("User", userScehma);
export default User;