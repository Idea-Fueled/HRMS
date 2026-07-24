import React, { useState } from "react";
import { Outlet } from "react-router-dom"
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
            {/* Sidebar with mobile toggle classes */}
            <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static transition-transform duration-300 ease-in-out z-50 shrink-0`}>
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Mobile Sidebar Overlay mask */}
            {sidebarOpen && (
                <div 
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                />
            )}

            {/* Main content viewport */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

                <main className="flex-1 overflow-y-auto min-w-0 bg-[#F8FAFC]">
                    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-7 space-y-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;