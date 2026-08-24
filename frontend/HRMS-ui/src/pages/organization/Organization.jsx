import React, { useState, useEffect, useRef } from "react";
import { 
    Building2, Building, Users, Search, 
    Layers, Grid, GitFork, ChevronRight, CheckCircle2,
    ZoomIn, ZoomOut, RotateCcw, Move
} from "lucide-react";
import { toast } from "sonner";
import { getAllEmployees } from "../../services/employee.service";
import { Avatar, SkeletonLoader } from "../../components/SharedComponents";

// Recursive Org Tree Node Component
const RecursiveOrgNode = ({ emp, allEmployees, onSelectDrawer }) => {
    const [expanded, setExpanded] = useState(true);

    const name = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`;
    const designation = emp.designation || "Team Member";
    const department = (emp.department || "SOFTWARE DEVELOPMENT").toUpperCase();
    const location = emp.location || emp.city || "Punjab";

    // Find all direct reports of this employee
    const directReports = allEmployees.filter(e => {
        if (!e.managerId) return false;
        const mId = typeof e.managerId === 'object' ? e.managerId._id : e.managerId;
        return mId && String(mId) === String(emp._id);
    });

    const reportCount = directReports.length;

    return (
        <div className="flex flex-col items-center shrink-0">
            {/* Employee Card */}
            <div 
                onClick={() => onSelectDrawer(emp)}
                className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-2xs hover:shadow-md transition-all w-[240px] sm:w-[255px] relative shrink-0 cursor-pointer text-left group z-10"
            >
                <div className="flex items-start gap-3">
                    <Avatar 
                        src={emp.profilePicture} 
                        name={name} 
                        size="w-11 h-11" 
                        textSize="text-xs font-bold" 
                        className="shrink-0 ring-2 ring-gray-100"
                    />
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-xs truncate leading-tight group-hover:text-[#2D79C7] transition-colors">{name}</h4>
                        <p className="text-[10.5px] text-gray-500 font-medium leading-snug mt-0.5 truncate">{designation}</p>
                        <span className="text-[10px] text-gray-400 font-medium block mt-0.5">{location}</span>
                        <span className="text-[9.5px] font-bold text-gray-500 tracking-wider uppercase block mt-1 truncate">{department}</span>
                    </div>
                </div>

                {/* Bottom Purple Circle Badge */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(!expanded);
                    }}
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#5B4699] hover:bg-[#48367A] text-white text-[10.5px] font-bold flex items-center justify-center shadow-2xs z-20 border border-white cursor-pointer transition-colors"
                >
                    {reportCount > 0 ? reportCount : "-"}
                </button>
            </div>

            {/* Direct Reports Sub-Branch */}
            {reportCount > 0 && expanded && (
                <div className="flex flex-col items-center pt-3 w-full">
                    {/* Vertical line from parent badge */}
                    <div className="w-0.5 h-6 bg-gray-300" />

                    {/* Horizontal connector line */}
                    {reportCount > 1 && (
                        <div className="w-[85%] h-0.5 bg-gray-300" />
                    )}

                    {/* Vertical lines to child nodes */}
                    <div className="flex gap-6 sm:gap-10 items-start justify-center">
                        {directReports.map((child) => (
                            <div key={child._id} className="flex flex-col items-center">
                                <div className="w-0.5 h-6 bg-gray-300" />
                                <RecursiveOrgNode 
                                    emp={child} 
                                    allEmployees={allEmployees} 
                                    onSelectDrawer={onSelectDrawer} 
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
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEntity, setSelectedEntity] = useState("all");
    const [viewMode, setViewMode] = useState("tree"); // "tree" | "departments" | "directory"
    const [selectedEmpDrawer, setSelectedEmpDrawer] = useState(null);

    // Zoom & Pan Canvas State
    const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%
    const [isDragging, setIsDragging] = useState(false);
    const treeContainerRef = useRef(null);
    const panStateRef = useRef({ startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });

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

    // Auto-enrich hierarchy so BOTH Esha & Puneet are top root nodes, with direct reports divided appropriately
    const enrichHierarchy = (list) => {
        if (list.length === 0) return [];

        // Find top founders / leaders
        const leaders = list.filter(e => {
            const desig = (e.designation || '').toLowerCase();
            const role = (e.role || '').toLowerCase();
            return desig.includes('ceo') || desig.includes('founder') || desig.includes('cto') || desig.includes('coo') || role === 'global_admin';
        });

        // Puneet Chopra (CTO) & Esha Mohindru (CEO)
        const ctoLeader = leaders.find(l => (l.designation || '').toLowerCase().includes('cto') || (l.fullName || '').toLowerCase().includes('puneet')) || leaders[0];
        const ceoLeader = leaders.find(l => l._id !== ctoLeader?._id) || (leaders.length > 1 ? leaders[1] : null);

        // Find department leads
        const leads = list.filter(e => {
            if (e._id === ctoLeader?._id || (ceoLeader && e._id === ceoLeader._id)) return false;
            const desig = (e.designation || '').toLowerCase();
            return desig.includes('lead') || desig.includes('manager') || desig.includes('head') || desig.includes('senior') || e.role === 'manager';
        });

        const techLead = leads.find(l => (l.department || '').toLowerCase().includes('software') || (l.designation || '').toLowerCase().includes('tech') || (l.fullName || '').toLowerCase().includes('rishabh')) || leads[0];

        return list.map(emp => {
            const empCopy = { ...emp };

            // If managerId already assigned in DB, preserve it
            if (empCopy.managerId) return empCopy;

            // Top Root Founders (No Manager)
            if (empCopy._id === ctoLeader?._id || (ceoLeader && empCopy._id === ceoLeader._id)) {
                empCopy.managerId = null;
            } else if (leads.some(l => l._id === empCopy._id)) {
                // Technical Leads report to Puneet (CTO), Business/Sales Leads report to Esha (CEO)
                const dept = (empCopy.department || '').toLowerCase();
                if (dept.includes('software') || dept.includes('tech') || dept.includes('dev')) {
                    empCopy.managerId = ctoLeader ? ctoLeader._id : null;
                } else {
                    empCopy.managerId = ceoLeader ? ceoLeader._id : (ctoLeader ? ctoLeader._id : null);
                }
            } else {
                // Team Members report to Tech Lead or Manager
                empCopy.managerId = techLead ? techLead._id : (ctoLeader ? ctoLeader._id : null);
            }
            return empCopy;
        });
    };

    // Zoom Handlers
    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.15, 1.8));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.15, 0.5));
    const handleZoomReset = () => setZoomLevel(1);

    // Mouse Drag (Pan) Handlers
    const handleMouseDown = (e) => {
        if (!treeContainerRef.current) return;
        setIsDragging(true);
        panStateRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            scrollLeft: treeContainerRef.current.scrollLeft,
            scrollTop: treeContainerRef.current.scrollTop
        };
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !treeContainerRef.current) return;
        e.preventDefault();
        const dx = e.clientX - panStateRef.current.startX;
        const dy = e.clientY - panStateRef.current.startY;
        treeContainerRef.current.scrollLeft = panStateRef.current.scrollLeft - dx;
        treeContainerRef.current.scrollTop = panStateRef.current.scrollTop - dy;
    };

    const handleMouseUpOrLeave = () => {
        setIsDragging(false);
    };

    // Filter employees by search & entity
    const filteredEmployees = employees.filter(emp => {
        const name = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`;
        const dept = emp.department || '';
        const desig = emp.designation || '';
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              dept.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              desig.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesEntity = selectedEntity === "all" || (emp.companyEntity || "Idea Fueled") === selectedEntity;
        return matchesSearch && matchesEntity;
    });

    // Root level nodes (No manager)
    const rootNodes = filteredEmployees.filter(emp => {
        if (!emp.managerId) return true;
        const mId = typeof emp.managerId === 'object' ? emp.managerId._id : emp.managerId;
        return !filteredEmployees.some(e => String(e._id) === String(mId));
    });

    // Group employees by department for department view
    const departmentsMap = filteredEmployees.reduce((acc, emp) => {
        const dept = emp.department || "General & Operations";
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(emp);
        return acc;
    }, {});

    const departmentNames = Object.keys(departmentsMap);
    const ideaFueledCount = employees.filter(e => (e.companyEntity || "").toLowerCase().includes("llp") === false).length;
    const ideaFueledLlpCount = employees.filter(e => (e.companyEntity || "").toLowerCase().includes("llp")).length;

    if (loading) {
        return (
            <div className="space-y-6 py-6">
                <SkeletonLoader type="stat" />
                <SkeletonLoader type="table" rows={6} />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12 animate-fadeIn select-none">
            {/* Header Bar */}
            <div className="bg-white border border-gray-200/80 rounded-[16px] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">Organization Hierarchy Tree</h1>
                    <p className="text-gray-500 text-xs font-medium mt-0.5">
                        Interactive 2D reporting manager chart with zoom & pan controls.
                    </p>
                </div>

                {/* View Switcher */}
                <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl border border-gray-200/50 self-start sm:self-auto">
                    <button
                        onClick={() => setViewMode("tree")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            viewMode === "tree" ? "bg-white text-[#2D79C7] shadow-xs" : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        <GitFork className="w-3.5 h-3.5" />
                        <span>Org Tree</span>
                    </button>

                    <button
                        onClick={() => setViewMode("departments")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            viewMode === "departments" ? "bg-white text-[#2D79C7] shadow-xs" : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Departments</span>
                    </button>

                    <button
                        onClick={() => setViewMode("directory")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            viewMode === "directory" ? "bg-white text-[#2D79C7] shadow-xs" : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        <Grid className="w-3.5 h-3.5" />
                        <span>Directory</span>
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200/80 rounded-[16px] p-5 shadow-sm flex items-center justify-between hover:border-gray-300 transition-all">
                    <div>
                        <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Total Members</span>
                        <div className="text-2xl font-black text-gray-900 mt-1">{employees.length}</div>
                        <span className="text-[11px] font-medium text-gray-500 mt-1 block">Active workforce</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2D79C7] flex items-center justify-center border border-blue-100">
                        <Users className="w-5 h-5" strokeWidth={2} />
                    </div>
                </div>

                <div className="bg-white border border-gray-200/80 rounded-[16px] p-5 shadow-sm flex items-center justify-between hover:border-gray-300 transition-all">
                    <div>
                        <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Departments</span>
                        <div className="text-2xl font-black text-gray-900 mt-1">{departmentNames.length}</div>
                        <span className="text-[11px] font-medium text-gray-500 mt-1 block">Functional teams</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <Layers className="w-5 h-5" strokeWidth={2} />
                    </div>
                </div>

                <div className="bg-white border border-gray-200/80 rounded-[16px] p-5 shadow-sm flex items-center justify-between hover:border-gray-300 transition-all">
                    <div>
                        <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Idea Fueled</span>
                        <div className="text-2xl font-black text-gray-900 mt-1">{ideaFueledCount} <span className="text-xs text-gray-400 font-medium">Members</span></div>
                        <span className="text-[11px] font-medium text-gray-500 mt-1 block">Regular entity</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-200">
                        <Building2 className="w-5 h-5" strokeWidth={2} />
                    </div>
                </div>

                <div className="bg-white border border-gray-200/80 rounded-[16px] p-5 shadow-sm flex items-center justify-between hover:border-gray-300 transition-all">
                    <div>
                        <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Idea Fueled LLP</span>
                        <div className="text-2xl font-black text-gray-900 mt-1">{ideaFueledLlpCount} <span className="text-xs text-gray-400 font-medium">Members</span></div>
                        <span className="text-[11px] font-medium text-gray-500 mt-1 block">LLP entity</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
                        <Building className="w-5 h-5" strokeWidth={2} />
                    </div>
                </div>
            </div>

            {/* Filter Bar & Canvas Controls */}
            <div className="bg-white border border-gray-200/80 rounded-[16px] p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md w-full">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search employee, department or designation..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50/80 border border-gray-200/80 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Entity Filter Toggle */}
                    <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl border border-gray-200/50">
                        <button
                            onClick={() => setSelectedEntity("all")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${selectedEntity === "all" ? "bg-white text-[#2D79C7] shadow-xs" : "text-gray-600 hover:text-gray-900"}`}
                        >
                            All Entities
                        </button>
                        <button
                            onClick={() => setSelectedEntity("Idea Fueled")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${selectedEntity === "Idea Fueled" ? "bg-white text-[#2D79C7] shadow-xs" : "text-gray-600 hover:text-gray-900"}`}
                        >
                            Idea Fueled
                        </button>
                        <button
                            onClick={() => setSelectedEntity("Idea Fueled LLP")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${selectedEntity === "Idea Fueled LLP" ? "bg-white text-[#2D79C7] shadow-xs" : "text-gray-600 hover:text-gray-900"}`}
                        >
                            Idea Fueled LLP
                        </button>
                    </div>

                    {/* Canvas Zoom Toolbar */}
                    {viewMode === "tree" && (
                        <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl border border-gray-200/50">
                            <button
                                onClick={handleZoomOut}
                                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all cursor-pointer"
                                title="Zoom Out (-)"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-gray-700 px-1.5 min-w-[42px] text-center">
                                {Math.round(zoomLevel * 100)}%
                            </span>
                            <button
                                onClick={handleZoomIn}
                                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all cursor-pointer"
                                title="Zoom In (+)"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleZoomReset}
                                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all cursor-pointer border-l border-gray-200 ml-0.5"
                                title="Reset Zoom (100%)"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* VIEW MODE 1: RECURSIVE ORG TREE WITH DRAG (PAN) & ZOOM */}
            {viewMode === "tree" && (
                <div className="relative bg-white border border-gray-200/80 rounded-[16px] shadow-sm overflow-hidden min-h-[580px]">
                    {/* Floating Drag/Pan Instruction Badge */}
                    <div className="absolute top-4 left-4 z-20 bg-gray-900/80 text-white backdrop-blur-xs text-[10.5px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md border border-gray-700">
                        <Move className="w-3.5 h-3.5 text-blue-300" />
                        <span>Hold & drag to pan • Scroll/buttons to zoom</span>
                    </div>

                    {/* Canvas Scroll Container */}
                    <div
                        ref={treeContainerRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUpOrLeave}
                        onMouseLeave={handleMouseUpOrLeave}
                        className={`w-full h-full min-h-[580px] overflow-auto p-12 flex justify-center ${
                            isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
                        }`}
                    >
                        {filteredEmployees.length === 0 ? (
                            <div className="text-center py-16 text-gray-400 font-medium">
                                No team members match your filter query.
                            </div>
                        ) : (
                            <div 
                                className="inline-flex gap-10 sm:gap-16 justify-center py-6 transition-transform duration-100 ease-out origin-top"
                                style={{ transform: `scale(${zoomLevel})` }}
                            >
                                {rootNodes.map((rootEmp) => (
                                    <RecursiveOrgNode 
                                        key={rootEmp._id} 
                                        emp={rootEmp} 
                                        allEmployees={filteredEmployees} 
                                        onSelectDrawer={setSelectedEmpDrawer} 
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* VIEW MODE 2: DEPARTMENT CARDS */}
            {viewMode === "departments" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {departmentNames.map((deptName) => {
                        const deptMembers = departmentsMap[deptName];
                        return (
                            <div key={deptName} className="bg-white border border-gray-200/80 rounded-[16px] shadow-sm overflow-hidden flex flex-col">
                                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2D79C7] flex items-center justify-center border border-blue-100 font-bold">
                                            <Layers className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-sm">{deptName}</h3>
                                    </div>
                                    <span className="text-xs font-bold text-gray-600 bg-gray-200/60 px-2.5 py-1 rounded-full">
                                        {deptMembers.length} {deptMembers.length === 1 ? 'Member' : 'Members'}
                                    </span>
                                </div>

                                <div className="p-4 flex-1 divide-y divide-gray-100">
                                    {deptMembers.map((emp) => {
                                        const name = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`;
                                        return (
                                            <div 
                                                key={emp._id} 
                                                onClick={() => setSelectedEmpDrawer(emp)}
                                                className="py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 px-2 rounded-lg transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar src={emp.profilePicture} name={name} size="w-8 h-8" textSize="text-[10px] font-bold" />
                                                    <div>
                                                        <span className="font-bold text-gray-900 text-xs block">{name}</span>
                                                        <span className="text-[10.5px] text-gray-500 font-medium">{emp.designation || 'Employee'}</span>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* VIEW MODE 3: DIRECTORY TABLE */}
            {viewMode === "directory" && (
                <div className="bg-white border border-gray-200/80 rounded-[16px] shadow-sm overflow-hidden">
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
                                    className="text-gray-400 hover:text-gray-700 text-xl font-bold cursor-pointer"
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
