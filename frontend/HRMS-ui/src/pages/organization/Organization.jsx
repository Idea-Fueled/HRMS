import React, { useState, useEffect, useRef } from "react";
import { 
    Building2, Building, Users, Search, 
    Layers, Grid, GitFork, ChevronRight, CheckCircle2,
    ZoomIn, ZoomOut, RotateCcw, Move, Target, User, Compass
} from "lucide-react";
import { toast } from "sonner";
import { getAllEmployees } from "../../services/employee.service";
import { Avatar, SkeletonLoader } from "../../components/SharedComponents";
import { useAuth } from "../../context/AuthContext";

// Single Org Node Card matching sample screenshot with sleek micro-animations
const OrgNodeCard = ({ emp, reportCount = "-", onSelect, isMe = false }) => {
    const name = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`;
    const designation = emp.designation || "Team Member";
    const department = (emp.department || "SOFTWARE DEVELOPMENT").toUpperCase();
    const location = emp.location || emp.city || "Punjab";

    return (
        <div 
            id={`org-node-${emp._id}`}
            onClick={() => onSelect(emp)}
            className={`bg-white border rounded-xl p-3.5 shadow-2xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out w-[240px] sm:w-[255px] relative shrink-0 cursor-pointer text-left group z-10 animate-node-in ${
                isMe ? "border-[#2D79C7] ring-2 ring-blue-200/70 pulse-active-node bg-blue-50/10" : "border-gray-200/90 hover:border-[#2D79C7]/60"
            }`}
        >
            <div className="flex items-start gap-3">
                <Avatar 
                    src={emp.profilePicture} 
                    name={name} 
                    size="w-11 h-11" 
                    textSize="text-xs font-bold" 
                    className="shrink-0 ring-2 ring-gray-100 group-hover:scale-105 transition-transform duration-300"
                />
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-xs truncate leading-tight group-hover:text-[#2D79C7] transition-colors">
                        {name} {isMe && <span className="text-[9px] bg-blue-100 text-[#2D79C7] px-1.5 py-0.5 rounded-full font-extrabold ml-1 inline-block shadow-2xs">YOU</span>}
                    </h4>
                    <p className="text-[10.5px] text-gray-500 font-medium leading-snug mt-0.5 truncate">{designation}</p>
                    <span className="text-[10px] text-gray-400 font-medium block mt-0.5">{location}</span>
                    <span className="text-[9.5px] font-bold text-gray-500 tracking-wider uppercase block mt-1 truncate group-hover:text-gray-700 transition-colors">{department}</span>
                </div>
            </div>

            {/* Bottom Purple Circle Badge with Spring Scale Animation */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#5B4699] text-white text-[10.5px] font-bold flex items-center justify-center shadow-md z-20 border-2 border-white group-hover:scale-115 group-hover:bg-[#48367A] transition-all duration-300">
                {reportCount}
            </div>
        </div>
    );
};

// Recursive Tree Node Component
const RecursiveOrgNode = ({ emp, allEmployees, onSelectDrawer, currentUserId }) => {
    const [expanded, setExpanded] = useState(true);

    // Find direct reports
    const directReports = allEmployees.filter(e => {
        if (!e.managerId) return false;
        const mId = typeof e.managerId === 'object' ? e.managerId._id : e.managerId;
        return mId && String(mId) === String(emp._id);
    });

    const reportCount = directReports.length > 0 ? directReports.length : "-";
    const isMe = String(emp._id) === String(currentUserId);

    return (
        <div className="flex flex-col items-center shrink-0">
            {/* Employee Card Container */}
            <div className="relative flex flex-col items-center">
                <OrgNodeCard 
                    emp={emp} 
                    reportCount={reportCount} 
                    onSelect={onSelectDrawer} 
                    isMe={isMe} 
                />

                {/* Expand / Collapse toggle click on badge area */}
                {directReports.length > 0 && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(!expanded);
                        }}
                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full opacity-0 z-30 cursor-pointer"
                        title={expanded ? "Collapse Branch" : "Expand Branch"}
                    />
                )}
            </div>

            {/* Direct Reports Sub-Branch with Line Animations */}
            {directReports.length > 0 && expanded && (
                <div className="flex flex-col items-center pt-3 w-full animate-fadeIn">
                    {/* Vertical connector line from parent */}
                    <div className="w-0.5 h-6 bg-gray-300/90 animate-line-grow" />

                    {/* Horizontal connector line across children */}
                    {directReports.length > 1 && (
                        <div className="w-[88%] h-0.5 bg-gray-300/90 animate-fadeIn" />
                    )}

                    {/* Vertical lines to child nodes */}
                    <div className="flex gap-6 sm:gap-10 items-start justify-center pt-0">
                        {directReports.map((child) => (
                            <div key={child._id} className="flex flex-col items-center">
                                <div className="w-0.5 h-6 bg-gray-300/90 animate-line-grow" />
                                <RecursiveOrgNode 
                                    emp={child} 
                                    allEmployees={allEmployees} 
                                    onSelectDrawer={onSelectDrawer} 
                                    currentUserId={currentUserId}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function Organization() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEntity, setSelectedEntity] = useState("all");
    const [viewMode, setViewMode] = useState("tree"); // "tree" | "directory"
    const [filterMeDeptOnly, setFilterMeDeptOnly] = useState(false);
    const [selectedEmpDrawer, setSelectedEmpDrawer] = useState(null);

    // Zoom & 360-degree Infinite 2D Transform Canvas State
    const [zoomLevel, setZoomLevel] = useState(0.85); // Default fit (~85%)
    const [panPos, setPanPos] = useState({ x: 0, y: 0 }); // 2D Infinite Transform Translation
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const res = await getAllEmployees();
            if (res.data?.success) {
                const list = res.data.employees || res.data.users || [];
                const processed = enrichHierarchy(list);
                setEmployees(processed);
            }
        } catch (err) {
            console.error("Error fetching employees:", err);
            toast.error("Failed to load organization members.");
        } finally {
            setLoading(false);
        }
    };

    // Auto-enrich hierarchy matching database & sample flowchart
    const enrichHierarchy = (list) => {
        if (list.length === 0) return [];

        const puneetLeader = list.find(l => {
            const name = (l.fullName || `${l.firstName || ''} ${l.lastName || ''}`).toLowerCase();
            const desig = (l.designation || '').toLowerCase();
            return name.includes('puneet') || desig.includes('cto') || desig.includes('co-founder');
        }) || list[0];

        const eshaLeader = list.find(l => {
            const name = (l.fullName || `${l.firstName || ''} ${l.lastName || ''}`).toLowerCase();
            const desig = (l.designation || '').toLowerCase();
            return (name.includes('esha') || desig.includes('ceo')) && l._id !== puneetLeader?._id;
        }) || null;

        const rishabhLead = list.find(l => {
            const name = (l.fullName || `${l.firstName || ''} ${l.lastName || ''}`).toLowerCase();
            return name.includes('rishabh');
        });

        const yogeshLead = list.find(l => {
            const name = (l.fullName || `${l.firstName || ''} ${l.lastName || ''}`).toLowerCase();
            return name.includes('yogesh');
        });

        const rajeevLead = list.find(l => {
            const name = (l.fullName || `${l.firstName || ''} ${l.lastName || ''}`).toLowerCase();
            return name.includes('rajeev');
        });

        return list.map(emp => {
            const empCopy = { ...emp };

            if (empCopy.managerId) {
                if (empCopy._id === puneetLeader?._id || (eshaLeader && empCopy._id === eshaLeader._id)) {
                    empCopy.managerId = null;
                }
                return empCopy;
            }

            const nameLower = (empCopy.fullName || `${empCopy.firstName || ''} ${empCopy.lastName || ''}`).toLowerCase();
            const deptLower = (empCopy.department || '').toLowerCase();
            const desigLower = (empCopy.designation || '').toLowerCase();

            // Top Level Leaders (Esha & Puneet side-by-side)
            if (empCopy._id === puneetLeader?._id || (eshaLeader && empCopy._id === eshaLeader._id) || nameLower.includes('puneet') || nameLower.includes('esha')) {
                empCopy.managerId = null;
            }
            // Direct reports to Puneet (Rishabh, Yogesh, Rajeev)
            else if (empCopy._id === rishabhLead?._id || empCopy._id === yogeshLead?._id || empCopy._id === rajeevLead?._id || nameLower.includes('rishabh') || nameLower.includes('yogesh') || nameLower.includes('rajeev')) {
                empCopy.managerId = puneetLeader ? puneetLeader._id : null;
            }
            // Sales Execs report to Yogesh
            else if (deptLower.includes('sales') || desigLower.includes('business associate') || desigLower.includes('business development') || nameLower.includes('bhumika') || nameLower.includes('vanshika') || nameLower.includes('anshik')) {
                empCopy.managerId = yogeshLead ? yogeshLead._id : (puneetLeader ? puneetLeader._id : null);
            }
            // Software Engineers report to Rishabh
            else {
                empCopy.managerId = rishabhLead ? rishabhLead._id : (puneetLeader ? puneetLeader._id : null);
            }

            return empCopy;
        });
    };

    // Navigation Quick Action Buttons (Top of Org / Me Filter)
    const scrollToTopOrg = () => {
        setFilterMeDeptOnly(false);
        setZoomLevel(0.85);
        setPanPos({ x: 0, y: 0 });
    };

    const handleMeFilterClick = () => {
        const myEmp = employees.find(e => String(e._id) === String(user?.id || user?._id));
        const myDept = myEmp?.department || user?.department || "HUMAN RESOURCES";

        setFilterMeDeptOnly(prev => !prev);
        setZoomLevel(0.9);
        setPanPos({ x: 0, y: 0 });
    };

    // Zoom Controls
    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.15, 1.8));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.15, 0.35));
    const handleZoomReset = () => {
        setFilterMeDeptOnly(false);
        setZoomLevel(0.85);
        setPanPos({ x: 0, y: 0 });
    };

    // 2D 360-degree Infinite Mouse Drag (Pan Canvas via CSS Transform)
    const handleMouseDown = (e) => {
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX - panPos.x,
            y: e.clientY - panPos.y
        };
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        setPanPos({
            x: e.clientX - dragStartRef.current.x,
            y: e.clientY - dragStartRef.current.y
        });
    };

    const handleMouseUpOrLeave = () => {
        setIsDragging(false);
    };

    // Mouse wheel panning & Ctrl + wheel zoom
    const handleWheel = (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.deltaY < 0) {
                handleZoomIn();
            } else {
                handleZoomOut();
            }
        } else {
            setPanPos(prev => ({
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY
            }));
        }
    };

    // Find logged-in user department
    const myEmp = employees.find(e => String(e._id) === String(user?.id || user?._id));
    const myDepartment = (myEmp?.department || user?.department || "HUMAN RESOURCES").toLowerCase();

    // Filter employees by search, entity, and "Me" department mode
    const filteredEmployees = employees.filter(emp => {
        const name = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`;
        const dept = (emp.department || '').toLowerCase();
        const desig = emp.designation || '';

        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              dept.includes(searchQuery.toLowerCase()) ||
                              desig.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesEntity = selectedEntity === "all" || (emp.companyEntity || "Idea Fueled") === selectedEntity;
        
        // If "Me" filter active, only include members of user's department or leadership
        const matchesMeDept = !filterMeDeptOnly || dept.includes(myDepartment) || emp._id === myEmp?._id || !emp.managerId;

        return matchesSearch && matchesEntity && matchesMeDept;
    });

    // Root level nodes
    const rootNodes = filteredEmployees.filter(emp => {
        if (!emp.managerId) return true;
        const mId = typeof emp.managerId === 'object' ? emp.managerId._id : emp.managerId;
        return !filteredEmployees.some(e => String(e._id) === String(mId));
    });

    if (loading) {
        return (
            <div className="space-y-6 py-6">
                <SkeletonLoader type="stat" />
                <SkeletonLoader type="table" rows={6} />
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-12 animate-fadeIn select-none">
            {/* Top Navigation Tabs Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <button
                        onClick={() => setViewMode("directory")}
                        className={`text-xs font-bold transition-all py-1 cursor-pointer border-b-2 hover:scale-105 active:scale-95 ${
                            viewMode === "directory" ? "text-[#2D79C7] border-[#2D79C7]" : "text-gray-500 border-transparent hover:text-gray-900"
                        }`}
                    >
                        Employee Directory
                    </button>
                    <button
                        onClick={() => setViewMode("tree")}
                        className={`text-xs font-bold transition-all py-1 cursor-pointer border-b-2 hover:scale-105 active:scale-95 ${
                            viewMode === "tree" ? "text-[#2D79C7] border-[#2D79C7]" : "text-gray-500 border-transparent hover:text-gray-900"
                        }`}
                    >
                        Organization Tree
                    </button>
                </div>
            </div>

            {/* Action Bar (Search + Go To Buttons) */}
            <div className="bg-white border border-gray-200/80 rounded-[16px] p-4 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md w-full">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search employee..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50/80 border border-gray-200/80 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2D79C7] transition-all focus:bg-white focus:shadow-xs"
                    />
                </div>

                {/* Quick Go To Navigation Buttons */}
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                    {viewMode === "tree" && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500 hidden sm:inline">Go to</span>
                            <button
                                onClick={scrollToTopOrg}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border hover:scale-105 active:scale-95 ${
                                    !filterMeDeptOnly ? "bg-blue-50 text-[#2D79C7] border-blue-200" : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                                }`}
                            >
                                <Compass className="w-3.5 h-3.5 text-[#2D79C7]" />
                                <span>Top of the Org</span>
                            </button>
                            <button
                                onClick={handleMeFilterClick}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border hover:scale-105 active:scale-95 ${
                                    filterMeDeptOnly ? "bg-purple-100 text-purple-800 border-purple-300 ring-2 ring-purple-200" : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                                }`}
                            >
                                <User className="w-3.5 h-3.5 text-purple-600" />
                                <span>Me</span>
                            </button>
                        </div>
                    )}

                    {/* Entity Filter Toggle */}
                    <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl border border-gray-200/50">
                        <button
                            onClick={() => setSelectedEntity("all")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${selectedEntity === "all" ? "bg-white text-[#2D79C7] shadow-xs" : "text-gray-600 hover:text-gray-900"}`}
                        >
                            All Entities
                        </button>
                        <button
                            onClick={() => setSelectedEntity("Idea Fueled")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${selectedEntity === "Idea Fueled" ? "bg-white text-[#2D79C7] shadow-xs" : "text-gray-600 hover:text-gray-900"}`}
                        >
                            Idea Fueled
                        </button>
                        <button
                            onClick={() => setSelectedEntity("Idea Fueled LLP")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 ${selectedEntity === "Idea Fueled LLP" ? "bg-white text-[#2D79C7] shadow-xs" : "text-gray-600 hover:text-gray-900"}`}
                        >
                            Idea Fueled LLP
                        </button>
                    </div>
                </div>
            </div>

            {/* VIEW MODE 1: TRUE 360-DEGREE INFINITE TRANSFORM CANVAS */}
            {viewMode === "tree" && (
                <div className="relative bg-[#F8FAFC] border border-gray-200/90 rounded-[16px] shadow-sm overflow-hidden h-[660px]">
                    {/* Floating Right Zoom Controls Toolbar */}
                    <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-xs border border-gray-200 rounded-xl shadow-md p-1 flex flex-col gap-1">
                        <button
                            onClick={handleZoomIn}
                            className="p-2 text-gray-600 hover:text-[#2D79C7] hover:bg-blue-50 rounded-lg transition-all cursor-pointer hover:scale-110 active:scale-95"
                            title="Zoom In (+)"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleZoomOut}
                            className="p-2 text-gray-600 hover:text-[#2D79C7] hover:bg-blue-50 rounded-lg transition-all cursor-pointer hover:scale-110 active:scale-95"
                            title="Zoom Out (-)"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleZoomReset}
                            className="p-2 text-gray-600 hover:text-[#2D79C7] hover:bg-blue-50 rounded-lg transition-all cursor-pointer border-t border-gray-100 hover:scale-110 active:scale-95"
                            title="Fit / Center Org Tree"
                        >
                            <Target className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Infinite Transform Canvas Viewport */}
                    <div
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUpOrLeave}
                        onMouseLeave={handleMouseUpOrLeave}
                        onWheel={handleWheel}
                        className={`w-full h-full flex items-center justify-center relative ${
                            isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
                        }`}
                    >
                        {filteredEmployees.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 font-medium animate-fadeIn">
                                No team members match your department filter.
                            </div>
                        ) : (
                            <div 
                                className="inline-flex gap-16 sm:gap-24 justify-center items-start min-w-max transition-transform duration-200 ease-out"
                                style={{ 
                                    transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoomLevel})`,
                                    transformOrigin: 'center center'
                                }}
                            >
                                {rootNodes.map((rootEmp) => (
                                    <RecursiveOrgNode 
                                        key={rootEmp._id} 
                                        emp={rootEmp} 
                                        allEmployees={filteredEmployees} 
                                        onSelectDrawer={setSelectedEmpDrawer} 
                                        currentUserId={user?.id || user?._id}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* VIEW MODE 2: DIRECTORY TABLE */}
            {viewMode === "directory" && (
                <div className="bg-white border border-gray-200/80 rounded-[16px] shadow-sm overflow-hidden animate-fadeIn">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/70">
                                    <th className="py-3.5 px-6">Member</th>
                                    <th className="py-3.5 px-6">Organization Entity</th>
                                    <th className="py-3.5 px-6">Department</th>
                                    <th className="py-3.5 px-6">Designation</th>
                                    <th className="py-3.5 px-6">Email</th>
                                    <th className="py-3.5 px-6 text-right">View Profile</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                                {filteredEmployees.map((emp) => {
                                    const name = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`;
                                    const isLLP = (emp.companyEntity || "").toLowerCase().includes("llp");

                                    return (
                                        <tr key={emp._id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="py-3.5 px-6">
                                                <div className="flex items-center gap-3">
                                                    <Avatar src={emp.profilePicture} name={name} size="w-9 h-9" textSize="text-xs font-bold" />
                                                    <div>
                                                        <span className="font-bold text-gray-900 block text-xs">{name}</span>
                                                        <span className="text-[10.5px] text-gray-500 font-medium">{emp.employeeId || 'IF-000'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-6">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${isLLP ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                                                    <Building2 className="w-3.5 h-3.5" />
                                                    {emp.companyEntity || "Idea Fueled"}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-6 font-bold text-gray-900">
                                                {emp.department || "General"}
                                            </td>
                                            <td className="py-3.5 px-6 font-medium text-gray-600">
                                                {emp.designation || "Team Member"}
                                            </td>
                                            <td className="py-3.5 px-6 text-gray-600 font-mono text-[11px]">
                                                {emp.email}
                                            </td>
                                            <td className="py-3.5 px-6 text-right">
                                                <button
                                                    onClick={() => setSelectedEmpDrawer(emp)}
                                                    className="px-3 py-1.5 bg-gray-100 hover:bg-[#2D79C7] text-gray-700 hover:text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* EMPLOYEE QUICK DRAWER MODAL */}
            {selectedEmpDrawer && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end">
                    <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto animate-slideLeft flex flex-col justify-between">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                <h3 className="font-bold text-gray-900 text-base">Employee Profile</h3>
                                <button
                                    onClick={() => setSelectedEmpDrawer(null)}
                                    className="text-gray-400 hover:text-gray-700 text-xl font-bold cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="text-center py-5 bg-gray-50/80 rounded-2xl border border-gray-200/80">
                                <Avatar 
                                    src={selectedEmpDrawer.profilePicture} 
                                    name={selectedEmpDrawer.fullName || selectedEmpDrawer.firstName} 
                                    size="w-20 h-20" 
                                    textSize="text-xl font-bold" 
                                    className="mx-auto mb-3 ring-4 ring-white shadow-xs"
                                />
                                <h4 className="font-bold text-gray-900 text-base">
                                    {selectedEmpDrawer.fullName || `${selectedEmpDrawer.firstName} ${selectedEmpDrawer.lastName}`}
                                </h4>
                                <p className="text-xs font-semibold text-[#2D79C7] mt-0.5">{selectedEmpDrawer.designation || 'Team Member'}</p>
                                <span className="text-[11px] text-gray-500 font-mono block mt-1">{selectedEmpDrawer.employeeId || 'IF-000'}</span>
                            </div>

                            <div className="space-y-3 text-xs font-medium">
                                <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl border border-gray-100">
                                    <span className="text-gray-500">Company Entity</span>
                                    <span className="font-bold text-gray-900">{selectedEmpDrawer.companyEntity || 'Idea Fueled'}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl border border-gray-100">
                                    <span className="text-gray-500">Department</span>
                                    <span className="font-bold text-gray-900">{selectedEmpDrawer.department || 'General'}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl border border-gray-100">
                                    <span className="text-gray-500">Location</span>
                                    <span className="font-bold text-gray-900">{selectedEmpDrawer.location || selectedEmpDrawer.city || 'Punjab'}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl border border-gray-100">
                                    <span className="text-gray-500">Email Address</span>
                                    <span className="font-mono text-gray-900 font-bold">{selectedEmpDrawer.email}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl border border-gray-100">
                                    <span className="text-gray-500">Role / Clearance</span>
                                    <span className="font-bold text-gray-900 uppercase text-[10.5px]">{selectedEmpDrawer.role || 'Employee'}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedEmpDrawer(null)}
                            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer mt-6"
                        >
                            Close Drawer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
