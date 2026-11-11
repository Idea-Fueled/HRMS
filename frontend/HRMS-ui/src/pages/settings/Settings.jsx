import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Shield, Lock, Bell, User, Check, AlertCircle,
    Eye, EyeOff, Save, Laptop, LogOut, Key, Clock,
    Sparkles, Calendar, CheckCircle2, Loader2, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { changeUserPassword, updateUserPreferences, logoutUser } from "../../services/auth.service";
import { Avatar } from "../../components/SharedComponents";
import ConfirmDialog from "../../components/ConfirmDialog";

const formatDate = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const Settings = () => {
    const { user, refreshUser, logout } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("security"); // security, notifications, preferences, session

    // Password State
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    // Notification Preferences State
    const [notifications, setNotifications] = useState({
        payslips: true,
        leaves: true,
        announcements: true,
        emails: true,
        inAppAlerts: true
    });
    const [savingNotifications, setSavingNotifications] = useState(false);

    // Display Preferences State
    const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
    const [compactMode, setCompactMode] = useState(false);
    const [savingDisplay, setSavingDisplay] = useState(false);

    // Logout Modal
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Load initial user preferences
    useEffect(() => {
        if (user?.preferences) {
            const prefs = user.preferences;
            if (prefs.emailNotifications) {
                setNotifications(prev => ({
                    ...prev,
                    payslips: prefs.emailNotifications.payslips !== false,
                    leaves: prefs.emailNotifications.leaves !== false,
                    announcements: prefs.emailNotifications.announcements !== false,
                    emails: prefs.emailNotifications.emails !== false
                }));
            }
            if (prefs.inAppAlerts !== undefined) {
                setNotifications(prev => ({ ...prev, inAppAlerts: prefs.inAppAlerts !== false }));
            }
            if (prefs.dateFormat) setDateFormat(prefs.dateFormat);
            if (prefs.compactMode !== undefined) setCompactMode(prefs.compactMode);
        }
    }, [user]);

    // Password Strength Calculation
    const passwordStrength = useMemo(() => {
        const pwd = passwordForm.newPassword;
        if (!pwd) return { score: 0, label: "None", color: "bg-gray-200" };

        let score = 0;
        if (pwd.length >= 8) score += 1;
        if (/[A-Z]/.test(pwd)) score += 1;
        if (/[0-9]/.test(pwd)) score += 1;
        if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

        if (score <= 1) return { score: 25, label: "Weak", color: "bg-rose-500", text: "text-rose-500" };
        if (score === 2) return { score: 50, label: "Fair", color: "bg-amber-500", text: "text-amber-500" };
        if (score === 3) return { score: 75, label: "Good", color: "bg-blue-500", text: "text-blue-500" };
        return { score: 100, label: "Strong", color: "bg-emerald-500", text: "text-emerald-500" };
    }, [passwordForm.newPassword]);

    // Handle Password Change
    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!passwordForm.currentPassword) {
            toast.error("Please enter your current password.");
            return;
        }
        if (passwordForm.newPassword.length < 8) {
            toast.error("New password must be at least 8 characters long.");
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error("New password and confirm password do not match.");
            return;
        }

        try {
            setChangingPassword(true);
            const res = await changeUserPassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
                confirmPassword: passwordForm.confirmPassword
            });
            if (res.data?.success) {
                toast.success(res.data.message || "Password changed successfully!");
                setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to change password.");
        } finally {
            setChangingPassword(false);
        }
    };

    // Handle Save Notification Preferences
    const handleSaveNotifications = async () => {
        try {
            setSavingNotifications(true);
            const res = await updateUserPreferences({
                emailNotifications: {
                    payslips: notifications.payslips,
                    leaves: notifications.leaves,
                    announcements: notifications.announcements,
                    emails: notifications.emails
                },
                inAppAlerts: notifications.inAppAlerts
            });
            if (res.data?.success) {
                toast.success("Notification preferences saved successfully.");
                await refreshUser();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update notification preferences.");
        } finally {
            setSavingNotifications(false);
        }
    };

    // Handle Save Display Preferences
    const handleSaveDisplay = async () => {
        try {
            setSavingDisplay(true);
            const res = await updateUserPreferences({
                dateFormat,
                compactMode
            });
            if (res.data?.success) {
                toast.success("Display preferences saved.");
                await refreshUser();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save display preferences.");
        } finally {
            setSavingDisplay(false);
        }
    };

    // Handle Logout Confirm
    const handleConfirmLogout = async () => {
        try {
            await logoutUser();
            toast.success("Logged out successfully.");
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            logout();
            navigate("/login");
        }
    };

    const userName = user?.fullName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.displayName || "User";

    return (
        <div className="space-y-4 sm:space-y-6 text-left select-none animate-fadeIn pb-12 max-w-5xl mx-auto">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                    <h2 className="text-[#1E1E1E] text-lg sm:text-[22px] font-extrabold flex items-center gap-2">
                        <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-[#2D79C7]" />
                        Account & Personal Settings
                    </h2>
                    <p className="text-gray-400 text-xs font-medium mt-1">
                        Manage your personal credentials, notification channels, and active security sessions.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                    <Avatar src={user?.profilePicture} name={userName} size="w-7 h-7" textSize="text-xs" />
                    <div>
                        <p className="text-xs font-bold text-gray-800 leading-none">{userName}</p>
                        <p className="text-[10px] text-[#2D79C7] font-semibold mt-0.5 uppercase tracking-wider">{user?.role || "Employee"}</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-gray-100/80 rounded-2xl border border-gray-200/60 overflow-x-auto max-w-full scrollbar-none shrink-0">
                <button
                    type="button"
                    onClick={() => setActiveTab("security")}
                    className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        activeTab === "security"
                            ? "bg-white text-[#2D79C7] shadow-sm"
                            : "text-gray-500 hover:text-gray-800"
                    }`}
                >
                    <Lock className="w-4 h-4" />
                    <span>Security & Password</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("notifications")}
                    className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        activeTab === "notifications"
                            ? "bg-white text-[#2D79C7] shadow-sm"
                            : "text-gray-500 hover:text-gray-800"
                    }`}
                >
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("preferences")}
                    className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        activeTab === "preferences"
                            ? "bg-white text-[#2D79C7] shadow-sm"
                            : "text-gray-500 hover:text-gray-800"
                    }`}
                >
                    <Sparkles className="w-4 h-4" />
                    <span>Appearance</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab("session")}
                    className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        activeTab === "session"
                            ? "bg-white text-[#2D79C7] shadow-sm"
                            : "text-gray-500 hover:text-gray-800"
                    }`}
                >
                    <Laptop className="w-4 h-4" />
                    <span>Session & Profile</span>
                </button>
            </div>

            {/* ─────────────────────────────────────────────
               TAB 1: SECURITY & PASSWORD
            ───────────────────────────────────────────── */}
            {activeTab === "security" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Form: Change Password */}
                    <div className="md:col-span-2 bg-white rounded-[20px] border border-gray-100 shadow-sm p-4 sm:p-6 space-y-5">
                        <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2D79C7] flex items-center justify-center">
                                <Key className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold text-[#1E1E1E]">Change Account Password</h3>
                                <p className="text-xs text-gray-400">Ensure your new password is at least 8 characters long</p>
                            </div>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            {/* Current Password */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Current Password <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? "text" : "password"}
                                        required
                                        placeholder="Enter your current password"
                                        value={passwordForm.currentPassword}
                                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 pr-10 bg-gray-50/70 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#2D79C7] focus:bg-white transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                    >
                                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    New Password <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        required
                                        placeholder="Minimum 8 characters"
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 pr-10 bg-gray-50/70 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#2D79C7] focus:bg-white transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                    >
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                {/* Password Strength Meter */}
                                {passwordForm.newPassword && (
                                    <div className="mt-2.5 space-y-1.5">
                                        <div className="flex items-center justify-between text-[11px] font-bold">
                                            <span className="text-gray-500">Strength:</span>
                                            <span className={passwordStrength.text}>{passwordStrength.label}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${passwordStrength.color} transition-all duration-300`}
                                                style={{ width: `${passwordStrength.score}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Confirm New Password <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        placeholder="Re-enter your new password"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 pr-10 bg-gray-50/70 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#2D79C7] focus:bg-white transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-3 border-t border-gray-100 flex items-center justify-end">
                                <button
                                    type="submit"
                                    disabled={changingPassword}
                                    className="px-5 py-2.5 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2 shadow-xs"
                                >
                                    {changingPassword ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Updating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>Update Password</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Panel: Password Guidance */}
                    <div className="space-y-4">
                        <div className="bg-gradient-to-br from-[#2D79C7] to-[#1F5EA8] text-white rounded-[20px] p-5 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 text-white">
                                <Shield className="w-5 h-5" />
                                <h4 className="font-black text-sm">Security Best Practices</h4>
                            </div>
                            <p className="text-xs text-white/80 leading-relaxed">
                                Keep your enterprise HRMS account safe by following recommended password standards.
                            </p>
                            <ul className="text-xs text-white/90 space-y-2 pt-2 border-t border-white/20">
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-300" />
                                    <span>At least 8 characters long</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-300" />
                                    <span>Combine letters and numbers</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-300" />
                                    <span>Include a special symbol (@, #, $)</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-300" />
                                    <span>Never share credentials with others</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-amber-50/70 border border-amber-200/80 rounded-[20px] p-4 text-xs text-amber-900 flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Need assistance?</p>
                                <p className="text-amber-800 text-[11px] mt-0.5">
                                    If you have forgotten your existing password, contact your HR Manager or Global Admin to issue a secure password reset.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               TAB 2: NOTIFICATIONS
            ───────────────────────────────────────────── */}
            {activeTab === "notifications" && (
                <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-4 sm:p-6 space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2D79C7] flex items-center justify-center">
                                <Bell className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold text-[#1E1E1E]">Email & Alert Preferences</h3>
                                <p className="text-xs text-gray-400">Choose what notifications you want to receive across HRMS</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveNotifications}
                            disabled={savingNotifications}
                            className="px-4 py-2 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shadow-xs"
                        >
                            {savingNotifications ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            <span>Save Preferences</span>
                        </button>
                    </div>

                    <div className="divide-y divide-gray-100 space-y-1">
                        {/* Payslip Notifications */}
                        <div className="pt-3 pb-3 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-gray-800">Monthly Payslip Issuance</p>
                                <p className="text-[11px] text-gray-400">Receive email notification when your official monthly payslip is generated</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={notifications.payslips}
                                    onChange={(e) => setNotifications(prev => ({ ...prev, payslips: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2D79C7]"></div>
                            </label>
                        </div>

                        {/* Leave Updates */}
                        <div className="pt-3 pb-3 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-gray-800">Leave Approvals & Status Updates</p>
                                <p className="text-[11px] text-gray-400">Get notified when your leave applications are approved, rejected, or modified</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={notifications.leaves}
                                    onChange={(e) => setNotifications(prev => ({ ...prev, leaves: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2D79C7]"></div>
                            </label>
                        </div>

                        {/* Company Announcements */}
                        <div className="pt-3 pb-3 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-gray-800">Company Announcements & Notice Board</p>
                                <p className="text-[11px] text-gray-400">Alerts when new official organization updates, holidays, or polls are published</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={notifications.announcements}
                                    onChange={(e) => setNotifications(prev => ({ ...prev, announcements: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2D79C7]"></div>
                            </label>
                        </div>

                        {/* Internal Emails */}
                        <div className="pt-3 pb-3 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-gray-800">Internal Inbox & Direct Emails</p>
                                <p className="text-[11px] text-gray-400">Notifications when team members send messages to your internal HRMS inbox</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={notifications.emails}
                                    onChange={(e) => setNotifications(prev => ({ ...prev, emails: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2D79C7]"></div>
                            </label>
                        </div>

                        {/* In-App Alerts */}
                        <div className="pt-3 pb-3 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-gray-800">In-App Live Toast Alerts</p>
                                <p className="text-[11px] text-gray-400">Display subtle popup notifications on top-right screen during active work session</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={notifications.inAppAlerts}
                                    onChange={(e) => setNotifications(prev => ({ ...prev, inAppAlerts: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2D79C7]"></div>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               TAB 3: APPEARANCE & DISPLAY
            ───────────────────────────────────────────── */}
            {activeTab === "preferences" && (
                <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-4 sm:p-6 space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2D79C7] flex items-center justify-center">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold text-[#1E1E1E]">Display & Regional Preferences</h3>
                                <p className="text-xs text-gray-400">Customize how information and dates are rendered for your workspace</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveDisplay}
                            disabled={savingDisplay}
                            className="px-4 py-2 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shadow-xs"
                        >
                            {savingDisplay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            <span>Save Preferences</span>
                        </button>
                    </div>

                    <div className="space-y-5">
                        {/* Date Format */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Date Display Format
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { id: "DD/MM/YYYY", label: "DD/MM/YYYY", sample: "16/10/2026 (Standard)" },
                                    { id: "MM/DD/YYYY", label: "MM/DD/YYYY", sample: "10/16/2026 (US)" },
                                    { id: "YYYY-MM-DD", label: "YYYY-MM-DD", sample: "2026-10-16 (ISO)" }
                                ].map(opt => (
                                    <div
                                        key={opt.id}
                                        onClick={() => setDateFormat(opt.id)}
                                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                            dateFormat === opt.id
                                                ? "border-[#2D79C7] bg-blue-50/50 text-[#2D79C7]"
                                                : "border-gray-200 hover:bg-gray-50 text-gray-700"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono font-bold text-xs">{opt.label}</span>
                                            {dateFormat === opt.id && <Check className="w-4 h-4 text-[#2D79C7]" />}
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-1">{opt.sample}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Compact Table Mode */}
                        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-gray-800">Compact Density View</p>
                                <p className="text-[11px] text-gray-400">Reduce cell padding in tables to see more rows without scrolling</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={compactMode}
                                    onChange={(e) => setCompactMode(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2D79C7]"></div>
                            </label>
                        </div>

                        {/* Theme Info */}
                        <div className="pt-4 border-t border-gray-100 bg-gray-50/70 p-4 rounded-xl flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-800">Corporate Branding & Palette</p>
                                <p className="text-[11px] text-gray-400">Official Idea Fueled enterprise theme is applied across all portal modules</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full bg-[#2D79C7]" title="Primary Accent" />
                                <div className="w-4 h-4 rounded-full bg-[#1F5EA8]" title="Primary Dark" />
                                <div className="w-4 h-4 rounded-full bg-[#F8FAFC] border border-gray-300" title="Background" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               TAB 4: SESSION & PROFILE
            ───────────────────────────────────────────── */}
            {activeTab === "session" && (
                <div className="space-y-4 sm:space-y-6">
                    {/* User Profile Card */}
                    <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
                            <div className="flex items-center gap-4">
                                <Avatar src={user?.profilePicture} name={userName} size="w-14 h-14" textSize="text-lg" />
                                <div>
                                    <h3 className="text-base font-extrabold text-[#1E1E1E]">{userName}</h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <span className="font-mono text-xs text-gray-500 font-semibold">{user?.employeeId || "EMP"}</span>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-xs text-gray-600 font-medium">{user?.designation || user?.department || "Member"}</span>
                                        <span className="text-gray-300">•</span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-[#2D79C7] border border-blue-100 uppercase">
                                            {user?.role || "employee"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => navigate("/me")}
                                className="px-3.5 py-2 border border-gray-200 hover:border-[#2D79C7] hover:text-[#2D79C7] text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                            >
                                <span>Go to Full Profile</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Account metadata table */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
                            <div className="p-3 bg-gray-50/60 rounded-xl">
                                <span className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider block">Official Email</span>
                                <span className="font-semibold text-gray-800 mt-0.5 block truncate">{user?.email || "—"}</span>
                            </div>
                            <div className="p-3 bg-gray-50/60 rounded-xl">
                                <span className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider block">Company Entity</span>
                                <span className="font-semibold text-gray-800 mt-0.5 block">{user?.companyEntity || "Idea Fueled"}</span>
                            </div>
                            <div className="p-3 bg-gray-50/60 rounded-xl">
                                <span className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider block">Joining Date</span>
                                <span className="font-semibold text-gray-800 mt-0.5 block">{formatDate(user?.joiningDate)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Active Session & Device Card */}
                    <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm p-4 sm:p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <Laptop className="w-5 h-5 text-[#2D79C7]" />
                                <h4 className="font-bold text-sm text-gray-800">Current Active Session</h4>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Active Now
                            </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600">
                            <div>
                                <p className="font-bold text-gray-800">Desktop Web Browser</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">Connected via secure HTTPS session token</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowLogoutConfirm(true)}
                                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Log Out From Device</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Logout Dialog */}
            {showLogoutConfirm && (
                <ConfirmDialog
                    isOpen={showLogoutConfirm}
                    title="Log Out from HRMS?"
                    message="Are you sure you want to log out of your account on this device?"
                    confirmLabel="Log Out"
                    variant="danger"
                    onConfirm={handleConfirmLogout}
                    onCancel={() => setShowLogoutConfirm(false)}
                />
            )}
        </div>
    );
};

export default Settings;
