import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { loginUser, getCurrentUser } from "../../services/auth.service";
import { useAuth } from "../../context/AuthContext";
import ideaFueledLogo from "../../assets/IF-black.png";
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { unlockAudio } from "../../utils/audioChime";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);

    const { user, setUser } = useAuth();
    const navigate = useNavigate();

    // Already authenticated — skip the login page entirely
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

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

            <div className="w-full max-w-[460px] sm:max-w-[480px] relative z-10">
                {/* Glassmorphism Card */}
                <div className="relative rounded-[28px] sm:rounded-[32px] p-7 sm:p-10 bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_20px_60px_-15px_rgba(45,121,199,0.14),0_10px_25px_-5px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/[0.03] transition-all">
                    {/* Subtle top inner reflection */}
                    <div className="absolute inset-0 rounded-[28px] sm:rounded-[32px] bg-gradient-to-b from-white/70 via-white/20 to-transparent pointer-events-none" />

                    <div className="relative z-10">
                        {/* Logo and Brand Section */}
                        <div className="flex flex-col items-center text-center mb-6">
                            <img
                                src={ideaFueledLogo}
                                alt="Idea Fueled logo"
                                className="h-11 sm:h-12 object-contain drop-shadow-xs"
                            />
                        </div>

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
                                    <Mail className="w-4.5 h-4.5 text-slate-400 absolute left-4 group-focus-within:text-[#2D79C7] transition-colors pointer-events-none" />
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
                                    <a href="#forgot" className="text-[#2D79C7] hover:text-[#1F5EA8] hover:underline text-[12px] font-bold transition-all">
                                        Forgot password?
                                    </a>
                                </div>
                                <div className="relative flex items-center group">
                                    <Lock className="w-4.5 h-4.5 text-slate-400 absolute left-4 group-focus-within:text-[#2D79C7] transition-colors pointer-events-none" />
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
                                        className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer p-1"
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
