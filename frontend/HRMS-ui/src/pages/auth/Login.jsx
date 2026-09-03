import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { loginUser, getCurrentUser } from "../../services/auth.service";
import { useAuth } from "../../context/AuthContext";
import ideaFueledLogo from "../../assets/IF-black.png";
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

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
                // Fetch the full user profile (cookie is now set by the login response)
                const profileRes = await getCurrentUser();

                if (profileRes.data && profileRes.data.success) {
                    const loggedInUser = profileRes.data.user;
                    // Sync into localStorage AND into AuthContext state in one shot
                    localStorage.setItem("user", JSON.stringify(loggedInUser));
                    setUser(loggedInUser);
                    toast.success("Login successful. Redirecting...");
                    navigate("/dashboard", { replace: true });
                } else {
                    toast.error("Failed to retrieve user profile after login.");
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
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 sm:p-6 select-none relative overflow-hidden">
            {/* Decorative ambient background glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-[#2D79C7]/8 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#1F5EA8]/8 rounded-full blur-[160px] pointer-events-none" />

            <div className="w-full max-w-[440px] sm:max-w-[460px] relative z-10">

                {/* Logo and Brand Section */}
                <div className="flex flex-col items-center text-center mb-6">
                    <img
                        src={ideaFueledLogo}
                        alt="Idea Fueled logo"
                        className="h-11 sm:h-12 object-contain"
                    />
                </div>

                {/* Heading */}
                <div className="text-center mb-8">
                    <h2 className="text-[#1E1E1E] text-2xl sm:text-[26px] font-bold tracking-tight">
                        Access your workspace
                    </h2>
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
                                className={`w-full pl-11 pr-4 py-3.5 bg-white border ${errors.email ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15" : "border-slate-200/90 hover:border-slate-300 focus:border-[#2D79C7] focus:ring-[#2D79C7]/15"} rounded-[14px] text-[13.5px] text-[#1E1E1E] placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 shadow-2xs`}
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
                                className={`w-full pl-11 pr-11 py-3.5 bg-white border ${errors.password ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15" : "border-slate-200/90 hover:border-slate-300 focus:border-[#2D79C7] focus:ring-[#2D79C7]/15"} rounded-[14px] text-[13.5px] text-[#1E1E1E] placeholder-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 shadow-2xs`}
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
                            className="w-full bg-[#2D79C7] hover:bg-[#1F5EA8] active:scale-[0.99] disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed text-white font-bold text-[14px] py-3.5 rounded-[14px] flex items-center justify-center gap-2.5 shadow-[0_4px_14px_rgba(45,121,199,0.25)] hover:shadow-[0_6px_20px_rgba(45,121,199,0.35)] transition-all duration-200 cursor-pointer"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
    );
};

export default Login;
