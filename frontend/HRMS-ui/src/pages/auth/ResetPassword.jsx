import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { verifyResetToken, resetUserPassword } from "../../services/auth.service";
import ideaFueledLogo from "../../assets/IF-black.png";
import { Lock, AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle2, ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";
    const email = searchParams.get("email") || "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [verifying, setVerifying] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [tokenError, setTokenError] = useState("");
    const [userName, setUserName] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errors, setErrors] = useState({ password: "", confirmPassword: "" });

    const navigate = useNavigate();

    // Verify token validity on load
    useEffect(() => {
        let isMounted = true;
        const checkToken = async () => {
            if (!token || !email) {
                if (isMounted) {
                    setVerifying(false);
                    setTokenValid(false);
                    setTokenError("Missing token or email in URL. Please check your reset link or request a new one.");
                }
                return;
            }

            try {
                const res = await verifyResetToken(token, email);
                if (isMounted) {
                    if (res.data && res.data.success) {
                        setTokenValid(true);
                        setUserName(res.data.user?.name || "");
                    } else {
                        setTokenValid(false);
                        setTokenError(res.data?.message || "Invalid or expired reset link.");
                    }
                }
            } catch (err) {
                if (isMounted) {
                    setTokenValid(false);
                    setTokenError(err.response?.data?.message || "This password reset link is invalid or has expired.");
                }
            } finally {
                if (isMounted) setVerifying(false);
            }
        };

        checkToken();
        return () => { isMounted = false; };
    }, [token, email]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        let hasError = false;
        const newErrors = { password: "", confirmPassword: "" };

        if (!password) {
            newErrors.password = "Password is required.";
            hasError = true;
        } else if (password.length < 8) {
            newErrors.password = "Password must be at least 8 characters long.";
            hasError = true;
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = "Please confirm your password.";
            hasError = true;
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match.";
            hasError = true;
        }

        setErrors(newErrors);
        if (hasError) return;

        try {
            setSubmitting(true);
            const res = await resetUserPassword({
                token,
                email,
                password
            });

            if (res.data && res.data.success) {
                setIsSuccess(true);
                toast.success(res.data.message || "Password updated successfully!");
                setTimeout(() => {
                    navigate("/login", { replace: true });
                }, 3000);
            } else {
                toast.error(res.data?.message || "Failed to reset password.");
            }
        } catch (err) {
            console.error("Reset error:", err);
            toast.error(err.response?.data?.message || "Failed to reset password. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EEF4FB] via-[#F8FAFD] to-[#E5EFF9] p-3.5 sm:p-6 select-none relative overflow-hidden">
            {/* Ambient colorful orbs */}
            <div className="absolute top-[-8%] left-[-8%] w-[420px] h-[420px] sm:w-[540px] sm:h-[540px] bg-gradient-to-br from-[#2D79C7]/25 to-[#60A5FA]/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[440px] h-[440px] sm:w-[560px] sm:h-[560px] bg-gradient-to-tl from-[#38BDF8]/25 via-[#2D79C7]/20 to-[#818CF8]/18 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-[460px] sm:max-w-[480px] relative z-10 flex flex-col items-center">
                {/* Brand Logo placed outside & centered above the card per reference design */}
                <div className="auth-logo-wrapper mb-8 sm:mb-10 flex items-center justify-center">
                    <img
                        src={ideaFueledLogo}
                        alt="Idea Fueled logo"
                        style={{ height: "42px", maxHeight: "42px", width: "auto" }}
                        className="auth-brand-logo h-[42px] max-h-[42px] w-auto object-contain drop-shadow-xs"
                    />
                </div>

                <div className="w-full relative rounded-[28px] sm:rounded-[32px] p-5 sm:p-10 bg-white/75 backdrop-blur-2xl border border-white/80 shadow-[0_20px_60px_-15px_rgba(45,121,199,0.14),0_10px_25px_-5px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.03] transition-all">
                    {/* Inner sheen */}
                    <div className="absolute inset-0 rounded-[28px] sm:rounded-[32px] bg-gradient-to-b from-white/70 via-white/20 to-transparent pointer-events-none" />

                    <div className="relative z-10">

                        {/* State 1: Verifying Token */}
                        {verifying && (
                            <div className="text-center py-8 space-y-4">
                                <div className="w-10 h-10 border-3 border-[#2D79C7]/30 border-t-[#2D79C7] rounded-full animate-spin mx-auto" />
                                <p className="text-slate-600 text-sm font-medium">Verifying your secure link...</p>
                            </div>
                        )}

                        {/* State 2: Invalid or Expired Token */}
                        {!verifying && !tokenValid && !isSuccess && (
                            <div className="text-center py-4 space-y-5">
                                <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200/80 flex items-center justify-center mx-auto text-rose-500 shadow-xs">
                                    <AlertCircle className="w-7 h-7" />
                                </div>
                                <div>
                                    <h2 className="text-[#1E1E1E] text-xl font-bold tracking-tight">
                                        Link Invalid or Expired
                                    </h2>
                                    <p className="text-slate-500 text-[13px] font-medium mt-2 leading-relaxed">
                                        {tokenError || "This password setup link is no longer valid or has expired."}
                                    </p>
                                </div>
                                <div className="pt-2">
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center justify-center gap-2 w-full bg-[#2D79C7] hover:bg-[#1F5EA8] text-white font-bold text-[13.5px] py-3.5 rounded-[14px] shadow-md shadow-[#2D79C7]/20 transition-all cursor-pointer"
                                    >
                                        <span>Back to Login</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* State 3: Password Reset Successful */}
                        {!verifying && isSuccess && (
                            <div className="text-center py-4 space-y-5">
                                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-500 shadow-sm animate-bounce">
                                    <CheckCircle2 className="w-9 h-9" />
                                </div>
                                <div>
                                    <h2 className="text-[#1E1E1E] text-2xl font-bold tracking-tight">
                                        Password Updated!
                                    </h2>
                                    <p className="text-slate-600 text-[13.5px] font-medium mt-2 leading-relaxed">
                                        Your password has been changed successfully. Redirecting to login in a moment...
                                    </p>
                                </div>
                                <div className="pt-2">
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center justify-center gap-2 w-full bg-[#2D79C7] hover:bg-[#1F5EA8] text-white font-bold text-[13.5px] py-3.5 rounded-[14px] shadow-md shadow-[#2D79C7]/20 transition-all cursor-pointer"
                                    >
                                        <span>Go to Login</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* State 4: Valid Token, Form to Set New Password */}
                        {!verifying && tokenValid && !isSuccess && (
                            <>
                                <div className="text-center mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2D79C7]/15 to-[#38BDF8]/20 flex items-center justify-center mx-auto text-[#2D79C7] mb-3 border border-[#2D79C7]/20">
                                        <KeyRound className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-[#1E1E1E] text-2xl font-bold tracking-tight">
                                        Set your password
                                    </h2>
                                    <p className="text-slate-500 text-[13px] font-medium mt-1.5 leading-normal">
                                        {userName ? `Welcome, ${userName}! ` : ""}Choose a secure password for <strong className="text-slate-700">{email}</strong>
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* New Password */}
                                    <div className="space-y-1.5">
                                        <label className="text-slate-600 text-[11.5px] font-bold uppercase tracking-wider block">
                                            New Password
                                        </label>
                                        <div className="relative flex items-center group">
                                            <Lock className="w-4.5 h-4.5 text-slate-400 absolute left-4 z-10 group-focus-within:text-[#2D79C7] transition-colors pointer-events-none" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => {
                                                    setPassword(e.target.value);
                                                    if (errors.password) setErrors(prev => ({ ...prev, password: "" }));
                                                }}
                                                placeholder="At least 8 characters"
                                                disabled={submitting}
                                                className={`w-full pl-11 pr-11 py-3.5 bg-white/80 backdrop-blur-xs border ${errors.password ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15" : "border-slate-200/90 hover:border-slate-300 focus:border-[#2D79C7] focus:ring-[#2D79C7]/15"} rounded-[14px] text-[13.5px] text-[#1E1E1E] placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 shadow-2xs`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 z-10 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer p-1"
                                            >
                                                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                                            </button>
                                        </div>
                                        {errors.password && (
                                            <p className="text-rose-500 text-[11px] font-semibold mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                <span>{errors.password}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Confirm Password */}
                                    <div className="space-y-1.5">
                                        <label className="text-slate-600 text-[11.5px] font-bold uppercase tracking-wider block">
                                            Confirm Password
                                        </label>
                                        <div className="relative flex items-center group">
                                            <ShieldCheck className="w-4.5 h-4.5 text-slate-400 absolute left-4 z-10 group-focus-within:text-[#2D79C7] transition-colors pointer-events-none" />
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => {
                                                    setConfirmPassword(e.target.value);
                                                    if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: "" }));
                                                }}
                                                placeholder="Re-enter password"
                                                disabled={submitting}
                                                className={`w-full pl-11 pr-11 py-3.5 bg-white/80 backdrop-blur-xs border ${errors.confirmPassword ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15" : "border-slate-200/90 hover:border-slate-300 focus:border-[#2D79C7] focus:ring-[#2D79C7]/15"} rounded-[14px] text-[13.5px] text-[#1E1E1E] placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 shadow-2xs`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-4 z-10 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer p-1"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                                            </button>
                                        </div>
                                        {errors.confirmPassword && (
                                            <p className="text-rose-500 text-[11px] font-semibold mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                <span>{errors.confirmPassword}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Submit Button */}
                                    <div className="pt-3">
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="w-full bg-[#2D79C7] hover:bg-[#1F5EA8] active:scale-[0.99] disabled:bg-[#4B8FD8] disabled:opacity-90 disabled:cursor-not-allowed text-white font-bold text-[14px] py-3.5 rounded-[14px] flex items-center justify-center gap-2.5 shadow-[0_4px_14px_rgba(45,121,199,0.25)] hover:shadow-[0_6px_20px_rgba(45,121,199,0.35)] transition-all duration-200 cursor-pointer"
                                        >
                                            {submitting ? (
                                                <div className="flex items-center gap-2.5 text-white">
                                                    <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    <span>Saving password...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <span>Save Password &amp; Login</span>
                                                    <ArrowRight className="w-4.5 h-4.5 stroke-[2.5]" />
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="text-center pt-2">
                                        <Link
                                            to="/login"
                                            className="text-slate-500 hover:text-slate-700 text-[12.5px] font-semibold transition-colors"
                                        >
                                            Cancel &amp; return to sign in
                                        </Link>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
