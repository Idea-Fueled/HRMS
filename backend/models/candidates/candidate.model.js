import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        default: ""
    },
    phone: {
        type: String,
        default: ""
    },
    address: {
        type: String,
        default: ""
    },
    photo: {
        type: String,
        default: ""
    },
    position: {
        type: String,
        default: "Software Engineer"
    },
    experience: {
        type: String,
        default: "0 Yrs"
    },
    currentCompany: {
        type: String,
        default: "N/A"
    },
    currentCtc: {
        type: String,
        default: "N/A"
    },
    expectedCtc: {
        type: String,
        default: "N/A"
    },
    noticePeriod: {
        type: String,
        default: "30 Days"
    },
    skills: [{
        type: String
    }],
    appliedDate: {
        type: String
    },
    stage: {
        type: String,
        default: "New Application"
    },
    status: {
        type: String,
        default: "In Progress"
    },
    assignedHr: {
        type: String,
        default: "Priya Sharma"
    },
    resume: {
        type: String,
        default: "Candidate_Resume.pdf"
    },
    interviews: [{
        id: { type: String },
        roundName: { type: String },
        interviewer: { type: String },
        date: { type: String },
        time: { type: String },
        meetingLink: { type: String },
        rating: { type: Number, default: 0 },
        feedback: { type: String, default: "" },
        status: { type: String, default: "Scheduled" }
    }],
    documents: [{
        id: { type: String },
        name: { type: String },
        type: { type: String },
        uploadDate: { type: String },
        size: { type: String },
        url: { type: String }
    }],
    offerDetails: {
        offeredCtc: { type: String },
        joiningDate: { type: String },
        offerDate: { type: String },
        status: { type: String },
        notes: { type: String }
    },
    archiveReason: {
        type: String,
        default: null
    }
}, { timestamps: true });

const Candidate = mongoose.model("Candidate", candidateSchema);

export default Candidate;
