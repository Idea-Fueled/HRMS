import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { loginUser, getCurrentUser, forgotPasswordRequest } from "../../services/auth.service";
import { useAuth } from "../../context/AuthContext";
import ideaFueledLogo from "../../assets/IF-black.png";
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff, KeyRound, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { unlockAudio } from "../../utils/audioChime";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);

    // Forgot password states
    const [isForgotOpen, setIsForgotOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotSuccess, setForgotSuccess] = useState(false);
    const [forgotError, setForgotError] = useState("");

    const { user, setUser } = useAuth();
    const navigate = useNavigate();

    // Already authenticated — skip the login page entirely
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleForgotPasswordSubmit = async (e) => {
        e.preventDefault();
        setForgotError("");

        if (!forgotEmail.trim()) {
            setForgotError("Please enter your email address.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
            setForgotError("Please enter a valid email address.");
            return;
        }

        try {
            setForgotLoading(true);
            const res = await forgotPasswordRequest(forgotEmail.trim());

            if (res.data && res.data.success) {
                setForgotSuccess(true);
                toast.success(res.data.message || "Password reset link sent!");
            } else {
                setForgotError(res.data?.message || "Failed to send reset link.");
            }
        } catch (err) {
            console.error("Forgot password error:", err);
            setForgotError(err.response?.data?.message || "Failed to send reset link. Please check your email.");
        } finally {
            setForgotLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let hasErrors = false;
        const newErrors = { email: "", password: "" };

        if (!email.trim()) {
            newErrors.email = "Email address is required.";
            hasErrors = true;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = "Please enter a valid email address.";
            hasErrors = true;
        }

        if (!password.trim()) {
            newErrors.password = "Password is required.";
            hasErrors = true;
        }

        setErrors(newErrors);
        if (hasErrors) return;

        try {
            setLoading(true);

            const response = await loginUser(email.trim(), password);

            if (response.data && response.data.success) {
                // Unlock browser audio context on this user click
                unlockAudio();

                const token = response.data.token;
                if (token) {
                    try {
                        localStorage.setItem("token", token);
                    } catch (e) {
                        console.warn("Could not save token:", e);
                    }
                }

                // If user object returned by loginUser, sync immediately without extra roundtrip
                const loggedInUser = response.data.user;
                if (loggedInUser) {
                    try {
                        localStorage.setItem("user", JSON.stringify(loggedInUser));
                    } catch (e) {
                        console.warn("Could not save user:", e);
                    }
                    setUser(loggedInUser);
                    toast.success("Login successful. Redirecting...");
                    navigate("/dashboard", { replace: true });
                } else {
                    // Fallback to fetch profile
                    const profileRes = await getCurrentUser();
                    if (profileRes.data && profileRes.data.success) {
                        const fetchedUser = profileRes.data.user;
                        localStorage.setItem("user", JSON.stringify(fetchedUser));
                        setUser(fetchedUser);
                        toast.success("Login successful. Redirecting...");
                        navigate("/dashboard", { replace: true });
                    } else {
                        toast.error("Failed to retrieve user profile after login.");
                    }
                }
            } else {
                toast.error(response.data?.message || "Invalid email or password.");
            }
        } catch (err) {
            console.error("Login error:", err);
            if (err.response) {
                toast.error(err.response.data?.message || "Invalid email or password.");
            } else {
                toast.error("Unable to connect to server. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EEF4FB] via-[#F8FAFD] to-[#E5EFF9] p-4 sm:p-6 select-none relative overflow-hidden">
            {/* Ambient colorful orbs for rich glassmorphism backdrop blur */}
            <div className="absolute top-[-8%] left-[-8%] w-[420px] h-[420px] sm:w-[540px] sm:h-[540px] bg-gradient-to-br from-[#2D79C7]/25 to-[#60A5FA]/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[440px] h-[440px] sm:w-[560px] sm:h-[560px] bg-gradient-to-tl from-[#38BDF8]/25 via-[#2D79C7]/20 to-[#818CF8]/18 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[280px] h-[280px] bg-indigo-300/15 rounded-full blur-[90px] pointer-events-none" />

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

                {/* Glassmorphism Card */}
                <div className="w-full relative rounded-[28px] sm:rounded-[32px] p-7 sm:p-10 bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_20px_60px_-15px_rgba(45,121,199,0.14),0_10px_25px_-5px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.03] transition-all">
                    {/* Subtle top inner reflection */}
                    <div className="absolute inset-0 rounded-[28px] sm:rounded-[32px] bg-gradient-to-b from-white/70 via-white/20 to-transparent pointer-events-none" />

                    <div className="relative z-10">
                        {/* FORGOT PASSWORD VIEW */}
                        {isForgotOpen ? (
                            <div className="space-y-6 animate-fadeIn">
                                {forgotSuccess ? (
                                    <div className="text-center py-3 space-y-4">
                                        <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-500 shadow-sm animate-bounce">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h2 className="text-[#1E1E1E] text-2xl font-bold tracking-tight">
                                                Check your email
                                            </h2>
                                            <p className="text-slate-600 text-[13px] font-medium mt-2 leading-relaxed">
                                                We've sent a password reset link to <strong className="text-slate-800">{forgotEmail}</strong>. Please check your inbox and follow the instructions.
                                            </p>
                                        </div>
                                        <div className="pt-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsForgotOpen(false);
                                                    setForgotSuccess(false);
                                                }}
                                                className="w-full bg-[#2D79C7] hover:bg-[#1F5EA8] text-white font-bold text-[13.5px] py-3.5 rounded-[14px] shadow-md shadow-[#2D79C7]/20 transition-all cursor-pointer"
                                            >
                                                Back to Sign In
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-center mb-5">
                                            <div className="w-11 h-11 rounded-2xl bg-[#2D79C7]/10 border border-[#2D79C7]/20 flex items-center justify-center mx-auto text-[#2D79C7] mb-3">
                                                <KeyRound className="w-5 h-5" />
                                            </div>
                                            <h2 className="text-[#1E1E1E] text-2xl font-bold tracking-tight">
                                                Reset Password
                                            </h2>
                                            <p className="text-slate-500 text-[13px] font-medium mt-1 leading-normal">
                                                Enter your registered email and we'll send you a link to reset your password.
                                            </p>
                                        </div>

                                        <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-slate-600 text-[11.5px] font-bold uppercase tracking-wider block">
                                                    Your Work Email
                                                </label>
                                                <div className="relative flex items-center group">
                                                    <Mail className="w-4.5 h-4.5 text-slate-400 absolute left-4 z-10 group-focus-within:text-[#2D79C7] transition-colors pointer-events-none" />
                                                    <input
                                                        type="email"
                                                        value={forgotEmail}
                                                        onChange={(e) => {
                                                            if (!email) setForgotEmail(e.target.value);
                                                            if (forgotError) setForgotError("");
                                                        }}
                                                        readOnly={Boolean(email)}
                                                        placeholder="Enter your registered email"
                                                        disabled={forgotLoading}
                                                        className={`w-full pl-11 pr-4 py-3.5 ${Boolean(email) ? "bg-slate-100/90 text-slate-700 cursor-not-allowed border-slate-200/90" : "bg-white/80 text-[#1E1E1E] border-slate-200/90 hover:border-slate-300 focus:border-[#2D79C7] focus:ring-[#2D79C7]/15"} backdrop-blur-xs border ${forgotError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15" : ""} rounded-[14px] text-[13.5px] placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 shadow-2xs font-medium`}
                                                    />
                                                </div>
                                                {email && (
                                                    <p className="text-slate-400 text-[11px] font-medium mt-1">
                                                        Using email entered on the sign in screen.
                                                    </p>
                                                )}
                                                {forgotError && (
                                                    <p className="text-rose-500 text-[11px] font-semibold mt-1 flex items-center gap-1">
                                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                        <span>{forgotError}</span>
                                                    </p>
                                                )}
                                            </div>

                                            <div className="pt-2">
                                                <button
                                                    type="submit"
                                                    disabled={forgotLoading}
                                                    className="w-full bg-[#2D79C7] hover:bg-[#1F5EA8] active:scale-[0.99] disabled:bg-[#4B8FD8] text-white font-bold text-[14px] py-3.5 rounded-[14px] flex items-center justify-center gap-2.5 shadow-[0_4px_14px_rgba(45,121,199,0.25)] hover:shadow-[0_6px_20px_rgba(45,121,199,0.35)] transition-all duration-200 cursor-pointer"
                                                >
                                                    {forgotLoading ? (
                                                        <div className="flex items-center gap-2 text-white">
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            <span>Sending link...</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span>Send Reset Link</span>
                                                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            <div className="text-center pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsForgotOpen(false);
                                                        setForgotError("");
                                                    }}
                                                    className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-[12.5px] font-semibold transition-colors cursor-pointer"
                                                >
                                                    <ArrowLeft className="w-3.5 h-3.5" />
                                                    <span>Back to sign in</span>
                                                </button>
                                            </div>
                                        </form>
                                    </>
                                )}
                            </div>
                        ) : (
                            /* STANDARD LOGIN VIEW */
                            <>
                                {/* Heading & Tagline */}
                                <div className="text-center mb-7">
                                    <h2 className="text-[#1E1E1E] text-2xl sm:text-[26px] font-bold tracking-tight">
                                        Access your workspace
                                    </h2>
                                    <p className="text-slate-500 text-[13px] font-medium mt-1.5 leading-normal">
                                        Sign in to manage your workday, attendance, and team.
                                    </p>
                                </div>

                                {/* Login Form */}
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Email Address */}
                                    <div className="space-y-2">
                                        <label className="text-slate-600 text-[11.5px] font-bold uppercase tracking-wider block">
                                            Email Address
                                        </label>
                                        <div className="relative flex items-center group">
                                            <Mail className="w-4.5 h-4.5 text-slate-400 absolute left-4 z-10 group-focus-within:text-[#2D79C7] transition-colors pointer-events-none" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => {
                                                    setEmail(e.target.value);
                                                    if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
                                                }}
                                                placeholder="Enter your email"
                                                disabled={loading}
                                                className={`w-full pl-11 pr-4 py-3.5 bg-white/80 backdrop-blur-xs border ${errors.email ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15" : "border-slate-200/90 hover:border-slate-300 focus:border-[#2D79C7] focus:ring-[#2D79C7]/15"} rounded-[14px] text-[13.5px] text-[#1E1E1E] placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 shadow-2xs`}
                                            />
                                        </div>
                                        {errors.email && (
                                            <p className="text-rose-500 text-[11px] font-semibold mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                <span>{errors.email}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-slate-600 text-[11.5px] font-bold uppercase tracking-wider">
                                                Password
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsForgotOpen(true);
                                                    setForgotEmail(email);
                                                    setForgotError("");
                                                    setForgotSuccess(false);
                                                }}
                                                className="text-[#2D79C7] hover:text-[#1F5EA8] hover:underline text-[12px] font-bold transition-all cursor-pointer bg-transparent border-0 p-0"
                                            >
                                                Forgot password?
                                            </button>
                                        </div>
                                        <div className="relative flex items-center group">
                                            <Lock className="w-4.5 h-4.5 text-slate-400 absolute left-4 z-10 group-focus-within:text-[#2D79C7] transition-colors pointer-events-none" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => {
                                                    setPassword(e.target.value);
                                                    if (errors.password) setErrors(prev => ({ ...prev, password: "" }));
                                                }}
                                                placeholder="••••••••"
                                                disabled={loading}
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

                                    {/* Sign In Button */}
                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-[#2D79C7] hover:bg-[#1F5EA8] active:scale-[0.99] disabled:bg-[#4B8FD8] disabled:opacity-90 disabled:cursor-not-allowed text-white font-bold text-[14px] py-3.5 rounded-[14px] flex items-center justify-center gap-2.5 shadow-[0_4px_14px_rgba(45,121,199,0.25)] hover:shadow-[0_6px_20px_rgba(45,121,199,0.35)] transition-all duration-200 cursor-pointer"
                                        >
                                            {loading ? (
                                                <div className="flex items-center gap-2.5 text-white">
                                                    <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    <span>Signing in...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <span>Sign In</span>
                                                    <ArrowRight className="w-4.5 h-4.5 stroke-[2.5]" />
                                                </>
                                            )}
                                        </button>
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

export default Login;
