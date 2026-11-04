import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { setPasswordViaInvite } from "../../services/employee.service";
import ideaFueledLogo from "../../assets/IF-black.png";
import { Lock, AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

const SetPasswordInvite = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || searchParams.get("inviteToken") || "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [employeeName, setEmployeeName] = useState("");
    const [employeeEmail, setEmployeeEmail] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");

        if (!token) {
            setErrorMessage("Invitation token is missing from the URL. Please check the email link sent to you.");
            return;
        }

        if (!password || password.length < 6) {
            setErrorMessage("Password must be at least 6 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await setPasswordViaInvite(token, password);
            if (res.data?.success) {
                setIsSuccess(true);
                setEmployeeName(res.data.employee?.name || "");
                setEmployeeEmail(res.data.employee?.email || "");
                toast.success("Password set successfully! You can now log in.");
                setTimeout(() => {
                    navigate("/login");
                }, 3500);
            } else {
                setErrorMessage(res.data?.message || "Failed to set password. Link may have expired.");
                toast.error(res.data?.message || "Failed to set password.");
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to set password. Link may be invalid or expired.";
            setErrorMessage(msg);
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Background glowing orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 relative z-10 transition-all">
                {/* Header Logo */}
                <div className="flex flex-col items-center mb-6">
                    <div className="h-14 w-auto flex items-center justify-center p-2 mb-2">
                        <img 
                            src={ideaFueledLogo} 
                            alt="Idea Fueled Logo" 
                            className="max-h-12 w-auto object-contain"
                            onError={(e) => { e.target.style.display = "none"; }}
                        />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-indigo-600" /> Welcome to Idea-Fueled HRMS
                    </span>
                    <h1 className="text-2xl font-bold text-slate-800 mt-3 text-center">Set Your Password</h1>
                    <p className="text-xs text-slate-500 text-center mt-1">
                        Create a secure password to access your HRMS employee account.
                    </p>
                </div>

                {isSuccess ? (
                    <div className="text-center py-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Account Activated!</h2>
                        <p className="text-sm text-slate-600 mt-2">
                            {employeeName ? `Welcome aboard, ${employeeName}! ` : ""}Your password has been successfully configured.
                        </p>
                        {employeeEmail && (
                            <p className="text-xs text-slate-500 mt-1 font-mono bg-slate-50 py-1 px-3 rounded-lg inline-block border border-slate-100">
                                {employeeEmail}
                            </p>
                        )}
                        <div className="mt-6">
                            <Link
                                to="/login"
                                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/20"
                            >
                                Continue to Login <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <p className="text-xs text-slate-400 mt-4">Redirecting automatically in a few seconds...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {errorMessage && (
                            <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2.5 text-xs text-red-600 animate-in fade-in">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-semibold block">Attention</span>
                                    <span>{errorMessage}</span>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Create New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your new password"
                                    required
                                    minLength={6}
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                    required
                                    minLength={6}
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {password && (
                            <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <div className={`flex items-center gap-1.5 ${password.length >= 6 ? "text-emerald-600" : "text-slate-400"}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${password.length >= 6 ? "bg-emerald-500" : "bg-slate-300"}`} />
                                    At least 6 characters
                                </div>
                                <div className={`flex items-center gap-1.5 ${password && confirmPassword && password === confirmPassword ? "text-emerald-600" : "text-slate-400"}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${password && confirmPassword && password === confirmPassword ? "bg-emerald-500" : "bg-slate-300"}`} />
                                    Passwords match
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Setting Password...
                                </>
                            ) : (
                                <>
                                    Activate Account & Set Password
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        <div className="text-center pt-2">
                            <Link to="/login" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default SetPasswordInvite;
