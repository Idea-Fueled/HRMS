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
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 select-none relative overflow-hidden">
            {/* Decorative background gradients (matching dashboard design language) */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#2D79C7]/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-[#1F5EA8]/5 rounded-full blur-[140px] pointer-events-none" />

            <div className="w-full max-w-[440px] bg-white border border-[#E5E7EB] rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_32px_rgba(45,121,199,0.06)] transition-all duration-300 p-8 relative z-10">

                {/* Logo and Brand Section */}
                <div className="flex flex-col items-center text-center mb-6">
                    <img
                        src={ideaFueledLogo}
                        alt="Idea Fueled logo"
                        className="h-10 object-contain"
                    />
                </div>

                {/* Heading & Description */}
                <div className="text-center mb-6">
                    <h2 className="text-[#1E1E1E] text-[18px] font-extrabold tracking-tight">
                        Access Your Portal
                    </h2>
                    <p className="text-gray-500 text-[12px] font-medium leading-relaxed mt-2 max-w-sm mx-auto">
                        Sign in to manage your workday, track attendance, and stay updated with organizational activities.
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email Address */}
                    <div className="space-y-1.5">
                        <label className="text-gray-500 text-[11px] font-bold uppercase tracking-wider block">
                            Email Address
                        </label>
                        <div className="relative flex items-center group">
                            <Mail className="w-4 h-4 text-gray-400 absolute left-4 group-focus-within:text-[#2D79C7] transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
                                }}
                                placeholder="Enter your email"
                                disabled={loading}
                                className={`w-full pl-11 pr-4 py-3 bg-[#F8FAFC] border ${errors.email ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10" : "border-[#E5E7EB] focus:border-[#2D79C7] focus:ring-[#2D79C7]/10"} rounded-[12px] text-[13px] text-[#1E1E1E] placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200`}
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
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                                Password
                            </label>
                            <a href="#forgot" className="text-[#2D79C7] hover:underline text-[11px] font-bold transition-all">
                                Forgot password?
                            </a>
                        </div>
                        <div className="relative flex items-center group">
                            <Lock className="w-4 h-4 text-gray-400 absolute left-4 group-focus-within:text-[#2D79C7] transition-colors" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (errors.password) setErrors(prev => ({ ...prev, password: "" }));
                                }}
                                placeholder="••••••••"
                                disabled={loading}
                                className={`w-full pl-11 pr-11 py-3 bg-[#F8FAFC] border ${errors.password ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10" : "border-[#E5E7EB] focus:border-[#2D79C7] focus:ring-[#2D79C7]/10"} rounded-[12px] text-[13px] text-[#1E1E1E] placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none cursor-pointer"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#2D79C7] hover:bg-[#1F5EA8] active:scale-[0.99] disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed text-white font-bold text-[13px] py-3.5 rounded-[12px] flex items-center justify-center gap-2 shadow-sm shadow-[#2D79C7]/10 hover:shadow-md transition-all duration-200 cursor-pointer"
                    >
                        {loading ? (
                            <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Sign In</span>
                                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
