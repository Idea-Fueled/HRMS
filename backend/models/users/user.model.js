import mongoose from "mongoose";

const userScehma = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true,
        unique: true,
        trim: true
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
        enum: ["global_admin", "hr", "manager", "employee"],
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
    bankName: {
        type: String,
    },

    accountHolderName: {
        type: String,
    },

    accountNumber: {
        type: String,
    },

    ifscCode: {
        type: String,
    },

    // identity information

    panNumber: {
        type: String,
    },

    aadhaarNumber: {
        type: String,
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
        }
    },

    // status
    status: {
        type: String,
        enum: [
            "active",
            "inactive",
            "on_notice",
            "terminated"
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
            organization: { type: Boolean, default: false }
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
            organization: false
        }
    }

},
    { timestamps: true }
)

const User = mongoose.model("User", userScehma);
export default User;