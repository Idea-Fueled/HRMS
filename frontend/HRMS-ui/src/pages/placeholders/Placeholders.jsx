import React from "react";
import { Users, Wallet, FileText, Clock, UserPlus, CreditCard, Search, RefreshCw, Building2 } from "lucide-react";

// Common Wrapper to match page header styling
const PageContainer = ({ title, children }) => {
    return (
        <div className="space-y-6 text-left select-none animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                    <h2 className="text-[#1E1E1E] text-[20px] font-extrabold">{title}</h2>
                    <p className="text-gray-400 text-[12px] font-medium mt-1">Manage and view your {title.toLowerCase()} details.</p>
                </div>
            </div>
            <div className="flex items-center justify-center min-h-[400px]">
                {children}
            </div>
        </div>
    );
};

// Standard Placeholder Card
const StandardPlaceholder = ({ title, icon: Icon, message }) => {
    return (
        <PageContainer title={title}>
            <div className="premium-3d-card p-10 max-w-md w-full text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#F0F7FF] border border-[#D0E5FC] flex items-center justify-center mb-5 text-[#2D79C7] shadow-inner">
                    <Icon className="w-7 h-7 stroke-[2]" />
                </div>
                <h3 className="text-[#1E1E1E] text-[16px] font-black">{title}</h3>
                <p className="text-gray-500 text-[12.5px] font-semibold mt-3.5 leading-relaxed">
                    {message}
                </p>
                <div className="mt-6 flex items-center gap-1.5 text-[#2D79C7] text-[11px] font-bold bg-[#F0F7FF] px-3.5 py-1.5 rounded-full border border-[#D0E5FC]/40 uppercase tracking-wider select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2D79C7] animate-pulse" />
                    Under Development
                </div>
            </div>
        </PageContainer>
    );
};

// Premium Phase 2 Card
const Phase2Placeholder = ({ title, icon: Icon }) => {
    return (
        <PageContainer title={title}>
            <div className="premium-3d-card p-10 max-w-md w-full text-center flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8]" />
                
                <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100/50 flex items-center justify-center mb-5 text-[#2D79C7] shadow-inner">
                    <Icon className="w-7 h-7 stroke-[2]" />
                </div>
                
                <div className="mb-4 inline-flex items-center gap-1.5 text-[#2D79C7] text-[9.5px] font-black bg-blue-50/50 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest select-none">
                    Phase 2
                </div>

                <h3 className="text-[#1E1E1E] text-[16px] font-black">Coming in Phase 2</h3>
                
                <p className="text-gray-500 text-[12.5px] font-semibold mt-3.5 leading-relaxed">
                    This module is planned for Phase 2 of the HRMS implementation and will be available in a future release.
                </p>
            </div>
        </PageContainer>
    );
};

// Individual Page Exports
export const MyTeam = () => (
    <StandardPlaceholder 
        title="My Team" 
        icon={Users} 
        message="My Team module is currently under development and will be available in an upcoming update." 
    />
);


export const TimeAttendance = () => (
    <StandardPlaceholder 
        title="Time Attend" 
        icon={Clock} 
        message="Time Attend module is currently under development and will be available in an upcoming update." 
    />
);

export const Hire = () => (
    <StandardPlaceholder 
        title="Hire" 
        icon={UserPlus} 
        message="Hire module is currently under development and will be available in an upcoming update." 
    />
);

// Phase 2 Modules
export const Payroll = () => (
    <Phase2Placeholder title="Payroll" icon={CreditCard} />
);

export const Recruitment = () => (
    <Phase2Placeholder title="Recruitment" icon={Search} />
);

export const Organization = () => (
    <Phase2Placeholder title="Organization" icon={Building2} />
);

