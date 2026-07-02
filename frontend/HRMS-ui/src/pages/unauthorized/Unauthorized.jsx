import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldOff, ArrowLeft } from "lucide-react";

const Unauthorized = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 select-none">
            <div className="bg-white border border-[#E5E7EB] rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-10 max-w-md w-full text-center flex flex-col items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
                    <ShieldOff className="w-7 h-7 text-rose-500" strokeWidth={1.5} />
                </div>

                <div>
                    <h1 className="text-[#1E1E1E] text-xl font-black tracking-tight">Access Denied</h1>
                    <p className="text-gray-400 text-sm mt-2 leading-relaxed max-w-xs mx-auto">
                        You do not have permission to access this section. Contact your administrator if you think this is a mistake.
                    </p>
                </div>

                <div className="w-full h-px bg-[#F3F4F6]" />

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-[12px] transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Go Back
                    </button>
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="flex-1 py-2.5 text-xs font-bold text-white bg-[#2D79C7] hover:bg-[#1F5EA8] rounded-[12px] shadow-md shadow-[#2D79C7]/20 transition-colors cursor-pointer"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;
