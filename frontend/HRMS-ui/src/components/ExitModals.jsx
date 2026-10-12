import React, { useState, useMemo } from "react";
import { X, AlertTriangle, Info, ChevronDown, Calendar, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { submitResignation, adminInitiateExit } from "../services/offboarding-onboarding.service";
import { Avatar } from "./SharedComponents";

/**
 * RESIGN JOB MODAL (Employee Self-Service)
 * Matches Screenshot 1
 */
export const ResignJobModal = ({ isOpen, onClose, onSuccess, employee }) => {
    const [hadDiscussion, setHadDiscussion] = useState("yes");
    const [discussionSummary, setDiscussionSummary] = useState("");
    const [reason, setReason] = useState("");
    const [preferenceEarlyLwd, setPreferenceEarlyLwd] = useState("yes");
    const [submitting, setSubmitting] = useState(false);
    const [showError, setShowError] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!reason || !reason.trim()) {
            setShowError(true);
            toast.error("Resignation reason is required.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await submitResignation({
                hadDiscussionWithManager: hadDiscussion === "yes",
                discussionSummary: discussionSummary.trim(),
                reasonForResignation: reason,
                preferenceEarlyLwd: preferenceEarlyLwd === "yes"
            });

            if (res.data?.success) {
                toast.success(res.data?.message || "Resignation submitted successfully.");
                if (onSuccess) onSuccess(res.data.offboardingRecord);
                onClose();
            } else {
                toast.error(res.data?.message || "Failed to submit resignation.");
            }
        } catch (err) {
            console.error("Resignation error:", err);
            toast.error(err.response?.data?.message || "Error submitting resignation.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
            <div className="bg-white border border-[#E5E7EB] rounded-[16px] shadow-2xl max-w-lg w-full overflow-hidden text-left animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-[16px] font-bold text-gray-800">Resign from job</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 font-extrabold text-[16px] cursor-pointer"
                    >
                        <X className="w-4.5 h-4.5" />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 space-y-4.5 max-h-[85vh] overflow-y-auto">
                    {/* Warning Box */}
                    <div className="bg-[#FEFCE8] border border-[#FEF08A] rounded-[10px] p-3.5 flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[12px] text-amber-800 leading-snug font-medium">
                            This will trigger your job resignation process. It is always advisable to talk to your management first before coming here!
                        </p>
                    </div>

                    {/* Question 1: Discussion with manager */}
                    <div className="space-y-2">
                        <label className="text-[12.5px] font-semibold text-gray-700 block">
                            Did you have discussion with manager on your decision to exit?
                        </label>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-medium text-gray-700">
                                <input
                                    type="radio"
                                    name="hadDiscussion"
                                    value="yes"
                                    checked={hadDiscussion === "yes"}
                                    onChange={() => setHadDiscussion("yes")}
                                    className="w-4 h-4 text-[#2D79C7] accent-[#2D79C7] cursor-pointer"
                                />
                                Yes
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-medium text-gray-700">
                                <input
                                    type="radio"
                                    name="hadDiscussion"
                                    value="no"
                                    checked={hadDiscussion === "no"}
                                    onChange={() => setHadDiscussion("no")}
                                    className="w-4 h-4 text-[#2D79C7] accent-[#2D79C7] cursor-pointer"
                                />
                                No
                            </label>
                        </div>
                    </div>

                    {/* Question 2: Summary */}
                    <div className="space-y-1.5">
                        <label className="text-[12.5px] font-semibold text-gray-700 block">
                            Please write the summary of your discussion
                        </label>
                        <textarea
                            rows="3"
                            value={discussionSummary}
                            onChange={(e) => setDiscussionSummary(e.target.value)}
                            placeholder="Type here"
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-gray-700 text-[12.5px] p-3 rounded-[8px] focus:outline-none focus:border-[#2D79C7] resize-none"
                        />
                    </div>

                    {/* Question 3: Reason */}
                    <div className="space-y-1.5">
                        <label className="text-[12.5px] font-semibold text-gray-700 block">
                            Please select a reason for your resignation <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                value={reason}
                                onChange={(e) => {
                                    setReason(e.target.value);
                                    if (showError) setShowError(false);
                                }}
                                className={`w-full appearance-none bg-[#F8FAFC] border ${showError && !reason ? "border-red-400 ring-1 ring-red-400" : "border-gray-200"} text-gray-700 text-[12.5px] py-2.5 pl-3 pr-8 rounded-[8px] focus:outline-none focus:border-[#2D79C7] cursor-pointer`}
                            >
                                <option value="">Select reason</option>
                                <option value="Better Opportunity">Better Opportunity</option>
                                <option value="Higher Studies">Higher Studies</option>
                                <option value="Relocation">Relocation</option>
                                <option value="Personal / Health Reasons">Personal / Health Reasons</option>
                                <option value="Career Transition">Career Transition</option>
                                <option value="Compensation & Benefits">Compensation & Benefits</option>
                                <option value="Work-Life Balance">Work-Life Balance</option>
                                <option value="Other">Other</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                        {showError && !reason && (
                            <p className="text-[11px] text-red-500 font-semibold pt-0.5">Resignation reason is required</p>
                        )}
                    </div>

                    {/* Question 4: Preference for early lwd */}
                    <div className="space-y-2">
                        <label className="text-[12.5px] font-semibold text-gray-700 block">
                            Any preference of an early last working day? <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-medium text-gray-700">
                                <input
                                    type="radio"
                                    name="preferenceEarlyLwd"
                                    value="yes"
                                    checked={preferenceEarlyLwd === "yes"}
                                    onChange={() => setPreferenceEarlyLwd("yes")}
                                    className="w-4 h-4 text-[#2D79C7] accent-[#2D79C7] cursor-pointer"
                                />
                                Yes
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-medium text-gray-700">
                                <input
                                    type="radio"
                                    name="preferenceEarlyLwd"
                                    value="no"
                                    checked={preferenceEarlyLwd === "no"}
                                    onChange={() => setPreferenceEarlyLwd("no")}
                                    className="w-4 h-4 text-[#2D79C7] accent-[#2D79C7] cursor-pointer"
                                />
                                No
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-[8px] border border-gray-300 text-gray-700 text-[12.5px] font-bold hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={handleSubmit}
                        className="px-5 py-2 rounded-[8px] bg-[#EF4444] hover:bg-[#DC2626] text-white text-[12.5px] font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-60"
                    >
                        {submitting ? "Submitting..." : "Submit resignation"}
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * ADMIN INITIATE EXIT MODAL (Global Admin)
 * Matches Screenshot 2 & Screenshot 3
 */
export const AdminInitiateExitModal = ({ isOpen, onClose, onSuccess, employee }) => {
    const [exitReasonType, setExitReasonType] = useState("Employee wants to resign"); // "Employee wants to resign" | "Company decides to terminate"
    const [hadDiscussed, setHadDiscussed] = useState("yes");
    const [discussionSummary, setDiscussionSummary] = useState("");
    const [reason, setReason] = useState("");
    const [noticeDate, setNoticeDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [recommendedLwdType, setRecommendedLwdType] = useState("original"); // "original" | "other"
    const [customLwdDate, setCustomLwdDate] = useState("");
    const [eligibleForRehire, setEligibleForRehire] = useState(true);
    const [additionalComments, setAdditionalComments] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showError, setShowError] = useState(false);

    const empName = employee?.fullName || `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim() || "Employee";
    const empDesignation = employee?.designation || "Staff";
    const empWorkerType = employee?.workerType || employee?.employementType || "Permanent";
    const empDept = employee?.department || "General";
    
    // Format Date of Joining e.g. "16 Feb 2026"
    const formattedDoj = useMemo(() => {
        if (!employee?.joiningDate) return "N/A";
        const d = new Date(employee.joiningDate);
        if (isNaN(d.getTime())) return "N/A";
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }, [employee?.joiningDate]);

    // Dynamic Notice Period Days:
    // - Probation (< 6 months from joiningDate): 20 days
    // - Technical team (>= 6 months, "Software Development" or "Design"): 60 days
    // - Non-Technical team (>= 6 months, all other departments): 30 days
    const noticeDays = useMemo(() => {
        if (!employee) return 30;
        const baseNotice = noticeDate ? new Date(noticeDate) : new Date();
        const join = employee.joiningDate ? new Date(employee.joiningDate) : null;

        if (join && !isNaN(join.getTime())) {
            const diffDays = Math.floor((baseNotice.getTime() - join.getTime()) / (1000 * 60 * 60 * 24));
            let probationDays = (employee.probationPeriod !== undefined && employee.probationPeriod !== null) ? Number(employee.probationPeriod) : 180;
            if (probationDays <= 12) probationDays = probationDays * 30;
            if (diffDays < probationDays) {
                return 20;
            }
        }

        const dept = (employee.department || "").trim().toLowerCase();
        if (dept === "software development" || dept === "design") {
            return 60;
        }

        return 30;
    }, [employee, noticeDate]);

    // Calculated Original Notice Last Working Day
    const calculatedLwdDateStr = useMemo(() => {
        const base = noticeDate ? new Date(noticeDate) : new Date();
        const lwd = new Date(base);
        lwd.setDate(lwd.getDate() + noticeDays);
        return lwd.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }, [noticeDate, noticeDays]);

    if (!isOpen || !employee) return null;

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!reason || !reason.trim()) {
            setShowError(true);
            toast.error(exitReasonType === "Company decides to terminate" ? "Termination reason is required." : "Resignation reason is required.");
            return;
        }

        if (recommendedLwdType === "other" && !customLwdDate) {
            toast.error("Please select a date for the recommended last working day.");
            return;
        }

        setSubmitting(true);
        try {
            const exitTypeVal = exitReasonType === "Company decides to terminate" ? "termination" : "resignation";
            const res = await adminInitiateExit({
                employeeId: employee._id || employee.id,
                exitType: exitTypeVal,
                hadDiscussionWithEmployee: hadDiscussed === "yes",
                discussionSummary: discussionSummary.trim(),
                reason,
                noticeDate,
                recommendedLwdType,
                customLwd: recommendedLwdType === "other" ? customLwdDate : null,
                eligibleForRehire,
                additionalComments: additionalComments.trim()
            });

            if (res.data?.success) {
                toast.success(res.data?.message || "Exit process initiated successfully.");
                if (onSuccess) onSuccess(res.data.offboardingRecord);
                onClose();
            } else {
                toast.error(res.data?.message || "Failed to initiate exit.");
            }
        } catch (err) {
            console.error("Initiate exit error:", err);
            toast.error(err.response?.data?.message || "Error initiating exit.");
        } finally {
            setSubmitting(false);
        }
    };

    const isTermination = exitReasonType === "Company decides to terminate";

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
            <div className="bg-white border border-[#E5E7EB] rounded-[16px] shadow-2xl max-w-lg w-full overflow-hidden text-left animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-[16px] font-bold text-gray-800">Initiate exit - {empName}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 font-extrabold text-[16px] cursor-pointer"
                    >
                        <X className="w-4.5 h-4.5" />
                    </button>
                </div>

                {/* Modal Form Scrollable Area */}
                <div className="p-6 space-y-4.5 max-h-[82vh] overflow-y-auto">
                    {/* Employee Card Snapshot (Screenshot 2) */}
                    <div className="bg-white border border-gray-200 rounded-[12px] p-4 shadow-sm space-y-3">
                        <div className="flex items-center gap-3">
                            <Avatar
                                src={employee.profilePicture}
                                name={empName}
                                size="w-11 h-11"
                                textSize="text-sm"
                            />
                            <div>
                                <h4 className="text-[14px] font-bold text-gray-800 leading-tight">{empName}</h4>
                                <p className="text-[11.5px] font-medium text-gray-500 mt-0.5">{empDesignation}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-[11px]">
                            <div>
                                <span className="text-gray-400 font-medium block">Worker type</span>
                                <span className="text-gray-800 font-bold block mt-0.5 capitalize">{empWorkerType}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 font-medium block">Department</span>
                                <span className="text-gray-800 font-bold block mt-0.5">{empDept}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 font-medium block">Date of joining</span>
                                <span className="text-gray-800 font-bold block mt-0.5">{formattedDoj}</span>
                            </div>
                        </div>
                    </div>

                    {/* Radio: Reason for initiating exit */}
                    <div className="space-y-2">
                        <label className="text-[12.5px] font-semibold text-gray-700 block">
                            What is the reason for initiating this exit?
                        </label>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-medium text-gray-700">
                                <input
                                    type="radio"
                                    name="exitReasonType"
                                    value="Employee wants to resign"
                                    checked={exitReasonType === "Employee wants to resign"}
                                    onChange={() => setExitReasonType("Employee wants to resign")}
                                    className="w-4 h-4 text-[#2D79C7] accent-[#2D79C7] cursor-pointer"
                                />
                                Employee wants to resign
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-medium text-gray-700">
                                <input
                                    type="radio"
                                    name="exitReasonType"
                                    value="Company decides to terminate"
                                    checked={exitReasonType === "Company decides to terminate"}
                                    onChange={() => setExitReasonType("Company decides to terminate")}
                                    className="w-4 h-4 text-[#2D79C7] accent-[#2D79C7] cursor-pointer"
                                />
                                Company decides to terminate
                            </label>
                        </div>
                    </div>

                    {/* Radio: Discussed with employee */}
                    <div className="space-y-2">
                        <label className="text-[12.5px] font-semibold text-gray-700 block">
                            Have you discussed this with the employee
                        </label>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-medium text-gray-700">
                                <input
                                    type="radio"
                                    name="hadDiscussed"
                                    value="yes"
                                    checked={hadDiscussed === "yes"}
                                    onChange={() => setHadDiscussed("yes")}
                                    className="w-4 h-4 text-[#2D79C7] accent-[#2D79C7] cursor-pointer"
                                />
                                Yes
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-medium text-gray-700">
                                <input
                                    type="radio"
                                    name="hadDiscussed"
                                    value="no"
                                    checked={hadDiscussed === "no"}
                                    onChange={() => setHadDiscussed("no")}
                                    className="w-4 h-4 text-[#2D79C7] accent-[#2D79C7] cursor-pointer"
                                />
                                No
                            </label>
                        </div>
                    </div>

                    {/* Discussion Summary */}
                    <div className="space-y-1.5">
                        <label className="text-[12.5px] font-semibold text-gray-700 block">
                            Discussion Summary
                        </label>
                        <textarea
                            rows="3"
                            value={discussionSummary}
                            onChange={(e) => setDiscussionSummary(e.target.value)}
                            placeholder="Type here"
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-gray-700 text-[12.5px] p-3 rounded-[8px] focus:outline-none focus:border-[#2D79C7] resize-none"
                        />
                    </div>

                    {/* Row: Reason for resignation/termination & Resignation notice date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[12.5px] font-semibold text-gray-700 block">
                                {isTermination ? "Reason for termination" : "Reason for resignation"} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={reason}
                                    onChange={(e) => {
                                        setReason(e.target.value);
                                        if (showError) setShowError(false);
                                    }}
                                    className={`w-full appearance-none bg-[#F8FAFC] border ${showError && !reason ? "border-red-400 ring-1 ring-red-400" : "border-gray-200"} text-gray-700 text-[12.5px] py-2 pl-3 pr-8 rounded-[8px] focus:outline-none focus:border-[#2D79C7] cursor-pointer`}
                                >
                                    <option value="">Select Reason</option>
                                    {isTermination ? (
                                        <>
                                            <option value="Performance Issues">Performance Issues</option>
                                            <option value="Policy Violation">Policy Violation</option>
                                            <option value="Restructuring / Downsizing">Restructuring / Downsizing</option>
                                            <option value="Misconduct">Misconduct</option>
                                            <option value="Mutual Agreement">Mutual Agreement</option>
                                            <option value="Other">Other</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="Better Opportunity">Better Opportunity</option>
                                            <option value="Higher Studies">Higher Studies</option>
                                            <option value="Relocation">Relocation</option>
                                            <option value="Personal / Health Reasons">Personal / Health Reasons</option>
                                            <option value="Career Transition">Career Transition</option>
                                            <option value="Compensation & Benefits">Compensation & Benefits</option>
                                            <option value="Work-Life Balance">Work-Life Balance</option>
                                            <option value="Other">Other</option>
                                        </>
                                    )}
                                </select>
                                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
                            </div>
                            {showError && !reason && (
                                <p className="text-[11px] text-red-500 font-semibold pt-0.5">
                                    {isTermination ? "Termination reason is required" : "Resignation reason is required"}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[12.5px] font-semibold text-gray-700 flex items-center gap-1">
                                {isTermination ? "Termination notice date" : "Resignation notice date"}
                                <HelpCircle className="w-3.5 h-3.5 text-gray-400" title="The formal notice date" />
                            </label>
                            <input
                                type="date"
                                value={noticeDate}
                                onChange={(e) => setNoticeDate(e.target.value)}
                                className="w-full bg-[#F8FAFC] border border-gray-200 text-gray-700 text-[12px] py-2 px-3 rounded-[8px] focus:outline-none focus:border-[#2D79C7] cursor-pointer font-medium"
                            />
                        </div>
                    </div>

                    {/* Recommended last working day? (Screenshot 3) */}
                    <div className="space-y-2 pt-1">
                        <label className="text-[12.5px] font-semibold text-gray-700 block">
                            Recommended last working day?
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-medium text-gray-700">
                                <input
                                    type="radio"
                                    name="recommendedLwdType"
                                    value="original"
                                    checked={recommendedLwdType === "original"}
                                    onChange={() => setRecommendedLwdType("original")}
                                    className="w-4 h-4 text-[#2D79C7] accent-[#2D79C7] cursor-pointer"
                                />
                                Original notice period - <span className="font-bold text-gray-900 ml-1">{calculatedLwdDateStr}</span>
                                <span className="text-[11px] text-gray-400 ml-1">({noticeDays} days)</span>
                            </label>

                            <div className="space-y-1.5">
                                <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-medium text-gray-700">
                                    <input
                                        type="radio"
                                        name="recommendedLwdType"
                                        value="other"
                                        checked={recommendedLwdType === "other"}
                                        onChange={() => setRecommendedLwdType("other")}
                                        className="w-4 h-4 text-[#2D79C7] accent-[#2D79C7] cursor-pointer"
                                    />
                                    Other: Select a date
                                </label>
                                {recommendedLwdType === "other" && (
                                    <div className="pl-6 pt-1">
                                        <input
                                            type="date"
                                            value={customLwdDate}
                                            onChange={(e) => setCustomLwdDate(e.target.value)}
                                            className="bg-[#F8FAFC] border border-gray-200 text-gray-700 text-[12px] py-1.5 px-3 rounded-[8px] focus:outline-none focus:border-[#2D79C7] cursor-pointer"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Checkbox: Eligible for rehire */}
                    <div className="pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-medium text-gray-700">
                            <input
                                type="checkbox"
                                checked={eligibleForRehire}
                                onChange={(e) => setEligibleForRehire(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-[#2D79C7] focus:ring-0 accent-[#2D79C7] cursor-pointer"
                            />
                            Mark employee as eligible for rehire
                        </label>
                    </div>

                    {/* Info banner (Screenshot 3) */}
                    <div className="bg-[#E0F2FE] border border-[#BAE6FD] rounded-[10px] p-3 flex items-start gap-2 text-[#0369A1]">
                        <Info className="w-4.5 h-4.5 text-[#0284C7] shrink-0 mt-0.5" />
                        <p className="text-[12px] font-medium leading-relaxed">
                            Submitting this will initiate an approval chain for approving this {isTermination ? "termination" : "resignation"}
                        </p>
                    </div>

                    {/* Additional comments */}
                    <div className="space-y-1.5">
                        <label className="text-[12.5px] font-semibold text-gray-700 block">
                            Additional comments
                        </label>
                        <textarea
                            rows="2"
                            value={additionalComments}
                            onChange={(e) => setAdditionalComments(e.target.value)}
                            placeholder="Optional notes or context..."
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-gray-700 text-[12.5px] p-3 rounded-[8px] focus:outline-none focus:border-[#2D79C7] resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-[8px] border border-gray-300 text-gray-700 text-[12.5px] font-bold hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={handleSubmit}
                        className="px-5 py-2 rounded-[8px] bg-[#EF4444] hover:bg-[#DC2626] text-white text-[12.5px] font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-60"
                    >
                        {submitting ? "Submitting..." : "Initiate exit"}
                    </button>
                </div>
            </div>
        </div>
    );
};
