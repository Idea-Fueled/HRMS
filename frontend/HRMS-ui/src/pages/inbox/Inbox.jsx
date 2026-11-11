import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    Inbox as InboxIcon,
    Send,
    Star,
    FileText,
    Trash2,
    Paperclip,
    Search,
    RefreshCw,
    PenSquare,
    CheckSquare,
    Square,
    Reply,
    Forward,
    Printer,
    X,
    ChevronLeft,
    Clock,
    User,
    Download,
    Maximize2,
    Minimize2,
    Filter,
    Check,
    AlertCircle,
    ChevronDown,
    Building2,
    Sparkles,
    Eye,
    EyeOff,
    RotateCcw,
    CheckCircle2,
    XCircle,
    Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
    fetchEmails,
    fetchEmailById,
    sendEmailMessage,
    saveEmailDraft,
    updateEmailStatus,
    deleteEmailMessage,
    batchEmailAction,
    fetchCompanyContacts,
} from "../../services/email.service";
import { getTeamLeaves, updateLeaveStatus } from "../../services/team.service";
import { Avatar } from "../../components/SharedComponents";
import RichTextEditor from "../../components/RichTextEditor";

/* ─────────────────────────────────────────────
   HELPERS & FORMATTERS
───────────────────────────────────────────── */
const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diffDays === 1) {
        return "Yesterday";
    }
    if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const formatFullDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatFileSize = (bytes = 0) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getPriorityBadge = (priority) => {
    switch (priority) {
        case "urgent":
            return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">Urgent</span>;
        case "high":
            return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">High</span>;
        case "low":
            return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">Low</span>;
        default:
            return null;
    }
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const Inbox = ({ initialFolder = "inbox" }) => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // Navigation / folder state
    const [currentFolder, setCurrentFolder] = useState(() => {
        const tab = searchParams.get("tab") || searchParams.get("folder");
        if (tab === "approvals") return "approvals";
        return initialFolder || "inbox";
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all"); // all, unread, starred

    // Approvals Hub state
    const [leaves, setLeaves] = useState([]);
    const [leaveStats, setLeaveStats] = useState({ pending: 0, approved: 0, rejected: 0 });
    const [loadingLeaves, setLoadingLeaves] = useState(false);
    const [approvalFilter, setApprovalFilter] = useState("pending"); // "all" | "pending" | "approved" | "rejected"
    const [approvalSearch, setApprovalSearch] = useState("");
    const [processingLeaveId, setProcessingLeaveId] = useState(null);

    const loadApprovals = useCallback(async () => {
        try {
            setLoadingLeaves(true);
            const res = await getTeamLeaves();
            if (res.data?.success) {
                const list = res.data.leaves || [];
                setLeaves(list);
                const pending = list.filter(l => (l.rawStatus || l.status || "").toLowerCase() === "pending").length;
                const approved = list.filter(l => (l.rawStatus || l.status || "").toLowerCase() === "approved").length;
                const rejected = list.filter(l => (l.rawStatus || l.status || "").toLowerCase() === "rejected").length;
                setLeaveStats({ pending, approved, rejected });
            }
        } catch (err) {
            console.error("Failed to load leave approvals:", err);
        } finally {
            setLoadingLeaves(false);
        }
    }, []);

    useEffect(() => {
        loadApprovals();
    }, [loadApprovals]);

    useEffect(() => {
        const tab = searchParams.get("tab") || searchParams.get("folder");
        if (tab === "approvals" && currentFolder !== "approvals") {
            setCurrentFolder("approvals");
        }
    }, [searchParams]);

    const handleLeaveAction = async (leaveId, status, remarks = "") => {
        try {
            setProcessingLeaveId(leaveId);
            const res = await updateLeaveStatus(leaveId, status, remarks);
            if (res.data?.success) {
                toast.success(`Leave request ${status} successfully.`);
                await loadApprovals();
            } else {
                toast.error(res.data?.message || `Failed to update status.`);
            }
        } catch (err) {
            console.error("Leave update failed:", err);
            toast.error(err.response?.data?.message || "Failed to update leave status.");
        } finally {
            setProcessingLeaveId(null);
        }
    };

    // Email data
    const [emails, setEmails] = useState([]);
    const [stats, setStats] = useState({
        unreadInbox: 0,
        totalInbox: 0,
        totalSent: 0,
        totalStarred: 0,
        totalDrafts: 0,
        totalTrash: 0,
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Selected email thread detail
    const [selectedEmailId, setSelectedEmailId] = useState(null);
    const [activeEmail, setActiveEmail] = useState(null);
    const [threadReplies, setThreadReplies] = useState([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Contacts directory for autocompletion
    const [contacts, setContacts] = useState([]);

    // Quick Reply input
    const [replyBody, setReplyBody] = useState("");
    const [sendingReply, setSendingReply] = useState(false);

    // Compose Modal state
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composeMaximized, setComposeMaximized] = useState(false);
    const [composeForm, setComposeForm] = useState({
        to: [],
        cc: [],
        bcc: [],
        subject: "",
        body: "",
        priority: "normal",
        labels: ["Work"],
        replyTo: null,
        attachments: [],
    });
    const [showCc, setShowCc] = useState(false);
    const [showBcc, setShowBcc] = useState(false);
    const [toInput, setToInput] = useState("");
    const [ccInput, setCcInput] = useState("");
    const [bccInput, setBccInput] = useState("");
    const [sendingCompose, setSendingCompose] = useState(false);
    const fileInputRef = useRef(null);

    // Load directory contacts once
    useEffect(() => {
        const loadContacts = async () => {
            try {
                const res = await fetchCompanyContacts();
                if (res.data?.success) {
                    setContacts(res.data.contacts || []);
                }
            } catch (err) {
                console.error("Failed to load contacts:", err);
            }
        };
        loadContacts();
    }, []);

    // Load emails
    const loadEmails = useCallback(async (showIndicator = true) => {
        if (showIndicator) setLoading(true);
        else setRefreshing(true);

        try {
            const params = {
                folder: currentFolder,
                search: searchQuery.trim() || undefined,
            };
            const res = await fetchEmails(params);
            if (res.data?.success) {
                setEmails(res.data.emails || []);
                if (res.data.stats) setStats(res.data.stats);
            }
        } catch (err) {
            console.error("Failed to load emails:", err);
            toast.error("Failed to load mailbox.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentFolder, searchQuery]);

    useEffect(() => {
        loadEmails(true);
        setSelectedIds(new Set());
    }, [loadEmails]);

    // Live Socket.IO incoming email listener
    useEffect(() => {
        const handleLiveEmail = (e) => {
            const newEmailData = e.detail?.email;
            if (newEmailData) {
                if (currentFolder === "inbox") {
                    setEmails((prev) => [newEmailData, ...prev.filter((em) => em._id !== newEmailData._id)]);
                }
                setStats((prev) => ({
                    ...prev,
                    unreadInbox: e.detail?.unreadInbox !== undefined ? e.detail.unreadInbox : prev.unreadInbox + 1,
                    totalInbox: prev.totalInbox + 1,
                }));
            }
        };

        window.addEventListener("hrms:new_email", handleLiveEmail);
        return () => window.removeEventListener("hrms:new_email", handleLiveEmail);
    }, [currentFolder]);

    // Prefill & open Compose Modal for Daily Status Report (DSR)
    const openDsrCompose = useCallback(
        (dsrInfo = null) => {
            const todayStr =
                dsrInfo?.date ||
                new Date().toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                });

            const empName =
                user?.fullName ||
                `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                "Employee";

            // Resolve reporting manager's email from directory contacts
            let managerRecipients = [];
            if (user?.managerId && contacts.length > 0) {
                const mgr = contacts.find((c) => String(c._id) === String(user.managerId));
                if (mgr?.email) managerRecipients.push(mgr.email);
            } else if (user?.reportingManager && contacts.length > 0) {
                const mgr = contacts.find(
                    (c) =>
                        String(c._id) === String(user.reportingManager) ||
                        c.email?.toLowerCase() === String(user.reportingManager).toLowerCase()
                );
                if (mgr?.email) managerRecipients.push(mgr.email);
            }

            const defaultDsrBody = `
<p><strong>Hi Team / Manager,</strong></p>
<p>Please find below my Daily Status Report (DSR) for <strong>${todayStr}</strong>:</p>
<br/>
<p><strong>1. Tasks Completed Today:</strong></p>
<ul>
    <li>Task 1: </li>
    <li>Task 2: </li>
</ul>
<br/>
<p><strong>2. Work In Progress:</strong></p>
<ul>
    <li>In-progress task: </li>
</ul>
<br/>
<p><strong>3. Blockers / Impediments (if any):</strong></p>
<p>None</p>
<br/>
<p><strong>4. Plan for Tomorrow:</strong></p>
<ul>
    <li>Planned item: </li>
</ul>
<br/>
<p>Warm regards,<br/><strong>${empName}</strong></p>
`.trim();

            setComposeForm({
                to: managerRecipients,
                cc: [],
                bcc: [],
                subject: `DSR - ${empName} - ${todayStr}`,
                body: defaultDsrBody,
                priority: "normal",
                labels: ["Work", "DSR"],
                replyTo: null,
                attachments: [],
            });
            setIsComposeOpen(true);
        },
        [user, contacts]
    );

    // Listen for custom event to trigger DSR Compose modal
    useEffect(() => {
        const handleOpenDsr = (e) => {
            openDsrCompose(e.detail);
        };
        window.addEventListener("hrms:open_dsr_compose", handleOpenDsr);
        return () => window.removeEventListener("hrms:open_dsr_compose", handleOpenDsr);
    }, [openDsrCompose]);

    // Check if query param requests opening DSR Compose (?compose=dsr)
    useEffect(() => {
        if (searchParams.get("compose") === "dsr") {
            openDsrCompose();
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("compose");
            setSearchParams(newParams, { replace: true });
        }
    }, [searchParams, openDsrCompose, setSearchParams]);

    // Fetch active email details when selected
    const handleSelectEmail = async (emailItem) => {
        setSelectedEmailId(emailItem._id);
        setLoadingDetail(true);

        // Optimistically mark as read in local list
        setEmails((prev) =>
            prev.map((e) => (e._id === emailItem._id ? { ...e, isRead: true } : e))
        );
        if (!emailItem.isRead && stats.unreadInbox > 0) {
            setStats((s) => ({ ...s, unreadInbox: Math.max(0, s.unreadInbox - 1) }));
        }

        try {
            const res = await fetchEmailById(emailItem._id);
            if (res.data?.success) {
                setActiveEmail(res.data.email);
                setThreadReplies(res.data.thread || []);
            }
        } catch (err) {
            console.error("Failed to load email thread:", err);
            toast.error("Could not load message details.");
        } finally {
            setLoadingDetail(false);
        }
    };

    // Toggle star on an email
    const handleToggleStar = async (e, emailItem) => {
        e.stopPropagation();
        const nextState = !emailItem.isStarred;

        // Optimistic UI
        setEmails((prev) =>
            prev.map((item) => (item._id === emailItem._id ? { ...item, isStarred: nextState } : item))
        );
        if (activeEmail && activeEmail._id === emailItem._id) {
            setActiveEmail((prev) => ({ ...prev, isStarred: nextState }));
        }

        try {
            await updateEmailStatus(emailItem._id, { isStarred: nextState });
            setStats((s) => ({
                ...s,
                totalStarred: nextState ? s.totalStarred + 1 : Math.max(0, s.totalStarred - 1),
            }));
        } catch (err) {
            console.error("Star update failed:", err);
            toast.error("Failed to update star.");
            // Revert
            setEmails((prev) =>
                prev.map((item) => (item._id === emailItem._id ? { ...item, isStarred: !nextState } : item))
            );
        }
    };

    // Toggle read/unread on single email
    const handleToggleRead = async (e, emailItem) => {
        e.stopPropagation();
        const nextRead = !emailItem.isRead;

        setEmails((prev) =>
            prev.map((item) => (item._id === emailItem._id ? { ...item, isRead: nextRead } : item))
        );
        if (activeEmail && activeEmail._id === emailItem._id) {
            setActiveEmail((prev) => ({ ...prev, isRead: nextRead }));
        }

        try {
            await updateEmailStatus(emailItem._id, { isRead: nextRead });
            setStats((s) => ({
                ...s,
                unreadInbox: nextRead ? Math.max(0, s.unreadInbox - 1) : s.unreadInbox + 1,
            }));
            toast.success(nextRead ? "Marked as read." : "Marked as unread.");
        } catch (err) {
            console.error("Read update failed:", err);
            toast.error("Failed to update status.");
        }
    };

    // Move single email to trash or permanent delete
    const handleDeleteSingle = async (e, emailItem) => {
        if (e) e.stopPropagation();
        try {
            await deleteEmailMessage(emailItem._id);
            toast.success(currentFolder === "trash" ? "Email permanently deleted." : "Moved to Trash.");
            setEmails((prev) => prev.filter((item) => item._id !== emailItem._id));
            if (selectedEmailId === emailItem._id) {
                setSelectedEmailId(null);
                setActiveEmail(null);
                setThreadReplies([]);
            }
            loadEmails(false);
        } catch (err) {
            console.error("Delete failed:", err);
            toast.error("Failed to delete email.");
        }
    };

    // Bulk selection helpers
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredEmails.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredEmails.map((e) => e._id)));
        }
    };

    const toggleSelectOne = (e, id) => {
        e.stopPropagation();
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleBatchAction = async (action) => {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        try {
            await batchEmailAction(ids, action);
            toast.success(`Action applied to ${ids.length} emails.`);
            setSelectedIds(new Set());
            loadEmails(false);
            if (action === "trash" || action === "deletePermanent") {
                if (selectedEmailId && ids.includes(selectedEmailId)) {
                    setSelectedEmailId(null);
                    setActiveEmail(null);
                }
            }
        } catch (err) {
            console.error("Batch action failed:", err);
            toast.error("Failed to apply batch action.");
        }
    };

    // Quick Reply to current active email
    const handleSendQuickReply = async () => {
        if (!replyBody.trim() || !activeEmail) return;
        setSendingReply(true);
        try {
            const replyToEmail = activeEmail.senderEmail;
            const res = await sendEmailMessage({
                to: [replyToEmail],
                subject: activeEmail.subject.startsWith("Re:") ? activeEmail.subject : `Re: ${activeEmail.subject}`,
                body: `<div style="font-family: inherit; line-height: 1.6;">${replyBody.replace(/\n/g, "<br/>")}</div>`,
                replyTo: activeEmail._id,
                priority: "normal",
                labels: activeEmail.labels || ["Work"],
            });

            if (res.data?.success) {
                toast.success("Reply sent successfully!");
                setReplyBody("");
                // Refresh thread
                const updated = await fetchEmailById(activeEmail._id);
                if (updated.data?.success) {
                    setActiveEmail(updated.data.email);
                    setThreadReplies(updated.data.thread || []);
                }
            }
        } catch (err) {
            console.error("Quick reply failed:", err);
            toast.error("Failed to send reply.");
        } finally {
            setSendingReply(false);
        }
    };

    // Forward current email
    const handleForwardEmail = (emailItem) => {
        setComposeForm({
            to: [],
            cc: [],
            bcc: [],
            subject: emailItem.subject.startsWith("Fwd:") ? emailItem.subject : `Fwd: ${emailItem.subject}`,
            body: `\n\n---------- Forwarded message ---------\nFrom: ${emailItem.senderName} <${emailItem.senderEmail}>\nDate: ${formatFullDate(emailItem.createdAt)}\nSubject: ${emailItem.subject}\n\n${emailItem.snippet || ""}`,
            priority: emailItem.priority || "normal",
            labels: emailItem.labels || ["Work"],
            replyTo: null,
            attachments: [],
        });
        setIsComposeOpen(true);
    };

    // Reply email in modal
    const handleReplyInModal = (emailItem) => {
        setComposeForm({
            to: [emailItem.senderEmail],
            cc: [],
            bcc: [],
            subject: emailItem.subject.startsWith("Re:") ? emailItem.subject : `Re: ${emailItem.subject}`,
            body: `\n\nOn ${formatFullDate(emailItem.createdAt)}, ${emailItem.senderName} wrote:\n> ${emailItem.snippet || ""}`,
            priority: "normal",
            labels: emailItem.labels || ["Work"],
            replyTo: emailItem._id,
            attachments: [],
        });
        setIsComposeOpen(true);
    };

    // Compose helpers
    const addRecipientChip = (field, emailVal) => {
        const clean = emailVal.trim().toLowerCase();
        if (!clean) return;
        if (!clean.includes("@")) {
            toast.error("Please enter a valid email address.");
            return;
        }
        if (composeForm[field].includes(clean)) return;

        setComposeForm((prev) => ({
            ...prev,
            [field]: [...prev[field], clean],
        }));
        if (field === "to") setToInput("");
        if (field === "cc") setCcInput("");
        if (field === "bcc") setBccInput("");
    };

    const removeRecipientChip = (field, emailVal) => {
        setComposeForm((prev) => ({
            ...prev,
            [field]: prev[field].filter((item) => item !== emailVal),
        }));
    };

    const handleFileSelected = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Check file sizes (max 10MB each)
        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error(`File "${file.name}" exceeds maximum allowed size of 10 MB.`);
                return;
            }
        }

        setComposeForm((prev) => ({
            ...prev,
            attachments: [...prev.attachments, ...files],
        }));
    };

    const removeAttachedFile = (index) => {
        setComposeForm((prev) => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index),
        }));
    };

    const handleSendCompose = async () => {
        // If user typed something in "To" field but didn't hit enter
        let finalTo = [...composeForm.to];
        if (toInput.trim() && toInput.includes("@") && !finalTo.includes(toInput.trim().toLowerCase())) {
            finalTo.push(toInput.trim().toLowerCase());
        }

        if (finalTo.length === 0) {
            toast.error("Please provide at least one recipient in 'To'.");
            return;
        }

        setSendingCompose(true);
        try {
            const formData = new FormData();
            formData.append("to", JSON.stringify(finalTo));
            formData.append("cc", JSON.stringify(composeForm.cc));
            formData.append("bcc", JSON.stringify(composeForm.bcc));
            formData.append("subject", composeForm.subject.trim() || "(No Subject)");
            const formattedBody = composeForm.body.trim().startsWith("<")
                ? `<div style="font-family: inherit; line-height: 1.6;">${composeForm.body}</div>`
                : `<div style="font-family: inherit; line-height: 1.6;">${composeForm.body.replace(/\n/g, "<br/>")}</div>`;
            formData.append("body", formattedBody);
            formData.append("priority", composeForm.priority);
            formData.append("labels", composeForm.labels.join(","));
            if (composeForm.replyTo) formData.append("replyTo", composeForm.replyTo);

            composeForm.attachments.forEach((file) => {
                formData.append("attachments", file);
            });

            const res = await sendEmailMessage(formData);
            if (res.data?.success) {
                toast.success("Email sent successfully!");
                setIsComposeOpen(false);
                setComposeForm({
                    to: [],
                    cc: [],
                    bcc: [],
                    subject: "",
                    body: "",
                    priority: "normal",
                    labels: ["Work"],
                    replyTo: null,
                    attachments: [],
                });
                setToInput("");
                loadEmails(false);
            }
        } catch (err) {
            console.error("Send compose error:", err);
            toast.error(err.response?.data?.message || "Failed to send email.");
        } finally {
            setSendingCompose(false);
        }
    };

    const handleSaveAsDraft = async () => {
        try {
            await saveEmailDraft({
                to: composeForm.to,
                subject: composeForm.subject || "(Draft)",
                body: composeForm.body,
                priority: composeForm.priority,
            });
            toast.success("Draft saved successfully.");
            setIsComposeOpen(false);
            loadEmails(false);
        } catch (err) {
            console.error("Save draft error:", err);
            toast.error("Failed to save draft.");
        }
    };

    // Filtered email list by unread / starred toggle
    const filteredEmails = useMemo(() => {
        return emails.filter((item) => {
            if (filterType === "unread") return !item.isRead;
            if (filterType === "starred") return item.isStarred;
            return true;
        });
    }, [emails, filterType]);

    // Autocomplete suggestions for "To" input
    const contactSuggestions = useMemo(() => {
        const query = toInput.trim().toLowerCase();
        if (!query) return [];
        return contacts
            .filter(
                (c) =>
                    c.email.toLowerCase().includes(query) ||
                    (c.fullName && c.fullName.toLowerCase().includes(query)) ||
                    (c.department && c.department.toLowerCase().includes(query))
            )
            .slice(0, 6);
    }, [contacts, toInput]);

    // Filtered team leave requests for Approvals Hub
    const filteredLeaves = useMemo(() => {
        let list = leaves;
        if (approvalFilter !== "all") {
            list = list.filter(l => (l.rawStatus || l.status || "").toLowerCase() === approvalFilter.toLowerCase());
        }
        if (approvalSearch.trim()) {
            const q = approvalSearch.toLowerCase().trim();
            list = list.filter(l =>
                (l.name && l.name.toLowerCase().includes(q)) ||
                (l.code && l.code.toLowerCase().includes(q)) ||
                (l.dept && l.dept.toLowerCase().includes(q)) ||
                (l.type && l.type.toLowerCase().includes(q)) ||
                (l.reason && l.reason.toLowerCase().includes(q))
            );
        }
        return list;
    }, [leaves, approvalFilter, approvalSearch]);

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden select-none">
            {/* ─────────────────────────────────────────────
               TOP APP BAR (SEARCH & ACTIONS)
            ───────────────────────────────────────────── */}
            <div className="h-16 px-6 border-b border-slate-200/90 bg-white flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="w-9 h-9 rounded-xl bg-[#225FA3]/10 flex items-center justify-center text-[#225FA3]">
                        <InboxIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-slate-900 capitalize leading-tight">Mailbox</h1>
                        <p className="text-[11px] text-slate-500 font-medium">
                            {stats.unreadInbox > 0 ? `${stats.unreadInbox} unread conversations in Inbox` : "All conversations read"}
                        </p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="flex-1 max-w-md mx-4 relative hidden sm:block">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search emails by subject, sender, or keyword..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200/90 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#225FA3]/20 focus:border-[#225FA3] focus:bg-white transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2.5 shrink-0">
                    <button
                        onClick={() => loadEmails(false)}
                        disabled={refreshing}
                        title="Refresh Mailbox"
                        className="p-2 text-slate-500 hover:text-[#225FA3] hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#225FA3]" : ""}`} />
                    </button>

                    <button
                        onClick={() => {
                            setComposeForm({
                                to: [],
                                cc: [],
                                bcc: [],
                                subject: "",
                                body: "",
                                priority: "normal",
                                labels: ["Work"],
                                replyTo: null,
                                attachments: [],
                            });
                            setIsComposeOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#225FA3] to-[#144277] text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow-md hover:from-[#1b4d84] hover:to-[#0f345e] transition-all cursor-pointer"
                    >
                        <PenSquare className="w-4 h-4" />
                        <span>Compose</span>
                    </button>
                </div>
            </div>

            {/* ─────────────────────────────────────────────
               BODY: 3-PANE LAYOUT
            ───────────────────────────────────────────── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* ── LEFT PANE: FOLDERS (WIDTH: 220px) ── */}
                <div className="w-56 shrink-0 border-r border-slate-200/80 bg-slate-50/50 flex flex-col justify-between p-3 overflow-y-auto">
                    <div className="space-y-4">
                        {/* Folders List */}
                        <div className="space-y-1">
                            <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Folders
                            </span>

                            {/* Inbox */}
                            <button
                                onClick={() => {
                                    setCurrentFolder("inbox");
                                    setSelectedEmailId(null);
                                    setActiveEmail(null);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    currentFolder === "inbox"
                                        ? "bg-[#225FA3] text-white shadow-sm"
                                        : "text-slate-700 hover:bg-slate-100/80"
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <InboxIcon className="w-4 h-4 shrink-0" />
                                    <span>Inbox</span>
                                </div>
                                {stats.unreadInbox > 0 && (
                                    <span
                                        className={`text-xs font-semibold tabular-nums ml-2 ${
                                            currentFolder === "inbox" ? "text-white" : "text-[#225FA3] font-bold"
                                        }`}
                                    >
                                        {stats.unreadInbox}
                                    </span>
                                )}
                            </button>

                            {/* Approvals Hub */}
                            <button
                                onClick={() => {
                                    setCurrentFolder("approvals");
                                    setSelectedEmailId(null);
                                    setActiveEmail(null);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    currentFolder === "approvals"
                                        ? "bg-[#225FA3] text-white shadow-sm"
                                        : "text-slate-700 hover:bg-slate-100/80"
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <CheckSquare className="w-4 h-4 shrink-0" />
                                    <span>Approvals</span>
                                </div>
                                {leaveStats.pending > 0 && (
                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ml-2 ${
                                            currentFolder === "approvals" ? "bg-white text-[#225FA3]" : "bg-amber-100 text-amber-800 border border-amber-200"
                                        }`}
                                    >
                                        {leaveStats.pending}
                                    </span>
                                )}
                            </button>

                            {/* Starred */}
                            <button
                                onClick={() => {
                                    setCurrentFolder("starred");
                                    setSelectedEmailId(null);
                                    setActiveEmail(null);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    currentFolder === "starred"
                                        ? "bg-[#225FA3] text-white shadow-sm"
                                        : "text-slate-700 hover:bg-slate-100/80"
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <Star className="w-4 h-4 shrink-0" />
                                    <span>Starred</span>
                                </div>
                                {stats.totalStarred > 0 && (
                                    <span
                                        className={`text-xs font-semibold tabular-nums ml-2 ${
                                            currentFolder === "starred" ? "text-white" : "text-slate-400"
                                        }`}
                                    >
                                        {stats.totalStarred}
                                    </span>
                                )}
                            </button>

                            {/* Sent */}
                            <button
                                onClick={() => {
                                    setCurrentFolder("sent");
                                    setSelectedEmailId(null);
                                    setActiveEmail(null);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    currentFolder === "sent"
                                        ? "bg-[#225FA3] text-white shadow-sm"
                                        : "text-slate-700 hover:bg-slate-100/80"
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <Send className="w-4 h-4 shrink-0" />
                                    <span>Sent</span>
                                </div>
                                {stats.totalSent > 0 && (
                                    <span
                                        className={`text-xs font-semibold tabular-nums ml-2 ${
                                            currentFolder === "sent" ? "text-white" : "text-slate-400"
                                        }`}
                                    >
                                        {stats.totalSent}
                                    </span>
                                )}
                            </button>

                            {/* Drafts */}
                            <button
                                onClick={() => {
                                    setCurrentFolder("drafts");
                                    setSelectedEmailId(null);
                                    setActiveEmail(null);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    currentFolder === "drafts"
                                        ? "bg-[#225FA3] text-white shadow-sm"
                                        : "text-slate-700 hover:bg-slate-100/80"
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <FileText className="w-4 h-4 shrink-0" />
                                    <span>Drafts</span>
                                </div>
                                {stats.totalDrafts > 0 && (
                                    <span
                                        className={`text-xs font-semibold tabular-nums ml-2 ${
                                            currentFolder === "drafts" ? "text-white" : "text-slate-400"
                                        }`}
                                    >
                                        {stats.totalDrafts}
                                    </span>
                                )}
                            </button>

                            {/* Trash */}
                            <button
                                onClick={() => {
                                    setCurrentFolder("trash");
                                    setSelectedEmailId(null);
                                    setActiveEmail(null);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    currentFolder === "trash"
                                        ? "bg-[#225FA3] text-white shadow-sm"
                                        : "text-slate-700 hover:bg-slate-100/80"
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <Trash2 className="w-4 h-4 shrink-0" />
                                    <span>Trash</span>
                                </div>
                                {stats.totalTrash > 0 && (
                                    <span
                                        className={`text-xs font-semibold tabular-nums ml-2 ${
                                            currentFolder === "trash" ? "text-white" : "text-slate-400"
                                        }`}
                                    >
                                        {stats.totalTrash}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* User Mailbox Info at Bottom of Left Sidebar */}
                    <div className="pt-3 border-t border-slate-200">
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-white border border-slate-200/80">
                            <div className="w-7 h-7 rounded-full bg-[#225FA3]/10 text-[#225FA3] flex items-center justify-center font-bold text-xs uppercase">
                                {user?.firstName ? user.firstName[0] : "U"}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-slate-800 truncate">
                                    {user?.fullName || "Employee"}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {currentFolder === "approvals" ? (
                    <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden min-h-0">
                        {/* Approvals Hub Header */}
                        <div className="p-6 pb-4 bg-white border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold shrink-0">
                                    <CheckSquare className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                                        Leave Approvals Hub
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Review and take instant action on team member leave requests
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => loadApprovals()}
                                disabled={loadingLeaves}
                                title="Refresh Requests"
                                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loadingLeaves ? "animate-spin text-[#2D79C7]" : "text-slate-500"}`} />
                                <span>Refresh</span>
                            </button>
                        </div>

                        {/* Top Metric Cards */}
                        <div className="p-6 pb-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                            <div
                                onClick={() => setApprovalFilter("pending")}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                    approvalFilter === "pending"
                                        ? "bg-amber-500/10 border-amber-300 ring-2 ring-amber-400/20"
                                        : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Review</span>
                                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="text-2xl font-black font-mono text-slate-900 mt-2">{leaveStats.pending}</div>
                                <span className="text-[11px] text-slate-400 font-medium">Awaiting manager action</span>
                            </div>

                            <div
                                onClick={() => setApprovalFilter("approved")}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                    approvalFilter === "approved"
                                        ? "bg-emerald-500/10 border-emerald-300 ring-2 ring-emerald-400/20"
                                        : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Approved</span>
                                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="text-2xl font-black font-mono text-slate-900 mt-2">{leaveStats.approved}</div>
                                <span className="text-[11px] text-slate-400 font-medium">Approved requests</span>
                            </div>

                            <div
                                onClick={() => setApprovalFilter("rejected")}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                    approvalFilter === "rejected"
                                        ? "bg-rose-500/10 border-rose-300 ring-2 ring-rose-400/20"
                                        : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rejected</span>
                                    <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                                        <XCircle className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="text-2xl font-black font-mono text-slate-900 mt-2">{leaveStats.rejected}</div>
                                <span className="text-[11px] text-slate-400 font-medium">Declined applications</span>
                            </div>

                            <div
                                onClick={() => setApprovalFilter("all")}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                    approvalFilter === "all"
                                        ? "bg-blue-500/10 border-blue-300 ring-2 ring-blue-400/20"
                                        : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Applications</span>
                                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2D79C7]">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="text-2xl font-black font-mono text-[#2D79C7] mt-2">{leaves.length}</div>
                                <span className="text-[11px] text-slate-400 font-medium">All applications</span>
                            </div>
                        </div>

                        {/* Filter & Search Bar */}
                        <div className="px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-2xs">
                                {["pending", "approved", "rejected", "all"].map((f) => (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setApprovalFilter(f)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                                            approvalFilter === f
                                                ? "bg-[#225FA3] text-white shadow-xs"
                                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                        }`}
                                    >
                                        {f === "pending"
                                            ? `Pending (${leaveStats.pending})`
                                            : f === "approved"
                                            ? `Approved (${leaveStats.approved})`
                                            : f === "rejected"
                                            ? `Rejected (${leaveStats.rejected})`
                                            : `All (${leaves.length})`}
                                    </button>
                                ))}
                            </div>

                            <div className="relative w-full sm:w-72">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={approvalSearch}
                                    onChange={(e) => setApprovalSearch(e.target.value)}
                                    placeholder="Search by employee, dept, reason..."
                                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2D79C7] shadow-2xs"
                                />
                            </div>
                        </div>

                        {/* Requests List */}
                        <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-3.5">
                            {loadingLeaves ? (
                                <div className="text-center py-16 text-slate-400">
                                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2D79C7] mb-2" />
                                    <p className="text-xs font-bold">Loading leave requests...</p>
                                </div>
                            ) : filteredLeaves.length === 0 ? (
                                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 shadow-2xs">
                                    <CheckSquare className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                    <h3 className="text-sm font-bold text-slate-700">No leave requests found</h3>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {approvalSearch ? "Try adjusting your search query." : "No records matching this status filter."}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {filteredLeaves.map((req) => {
                                        const isPending = (req.rawStatus || req.status || "").toLowerCase() === "pending";
                                        const isApproved = (req.rawStatus || req.status || "").toLowerCase() === "approved";
                                        const isRejected = (req.rawStatus || req.status || "").toLowerCase() === "rejected";
                                        const isTarget = searchParams.get("leaveId") === req._id;

                                        return (
                                            <div
                                                key={req._id}
                                                className={`bg-white border rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-all ${
                                                    isTarget
                                                        ? "border-amber-400 ring-2 ring-amber-300/40"
                                                        : "border-slate-200/90 hover:border-slate-300"
                                                }`}
                                            >
                                                <div className="space-y-3">
                                                    {/* Employee Header */}
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar
                                                                src={req.profilePicture}
                                                                name={req.name}
                                                                size="w-10 h-10 text-xs font-bold"
                                                            />
                                                            <div>
                                                                <h4 className="text-sm font-bold text-slate-900 leading-tight">
                                                                    {req.name}
                                                                </h4>
                                                                <p className="text-[11px] text-slate-500 font-medium">
                                                                    {req.designation ? `${req.designation} • ` : ""}{req.dept || "General"}
                                                                    {req.code ? ` • ${req.code}` : ""}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Status Badge */}
                                                        {isPending ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                                                ● Pending
                                                            </span>
                                                        ) : isApproved ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                                                ✓ Approved
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                                                ✕ Rejected
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Details Pill Row */}
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold bg-blue-50 text-[#2D79C7] border border-blue-100">
                                                            {req.type || req.leaveType || "Leave"}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                            <Calendar className="w-3 h-3 text-slate-400" />
                                                            {req.start}{req.end && req.end !== req.start ? ` → ${req.end}` : ""}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold bg-slate-100 text-slate-800 border border-slate-200">
                                                            <Clock className="w-3 h-3 text-slate-400" />
                                                            {req.duration || `${req.totalDays} Day(s)`}
                                                        </span>
                                                    </div>

                                                    {/* Reason Box */}
                                                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-xs text-slate-700 font-medium leading-relaxed">
                                                        <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Reason:</span>
                                                        {req.reason || "No reason specified"}
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        Applied: {req.appliedDate || "Recently"}
                                                    </span>

                                                    {isPending ? (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleLeaveAction(req._id, "approved")}
                                                                disabled={processingLeaveId === req._id}
                                                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                                <span>{processingLeaveId === req._id ? "Processing..." : "Approve 🟢"}</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleLeaveAction(req._id, "rejected")}
                                                                disabled={processingLeaveId === req._id}
                                                                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                                <span>Reject 🔴</span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-500">
                                                            {isApproved ? "Approved by Management" : "Declined"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── MIDDLE PANE: EMAIL LIST (WIDTH: ~380px - 440px or full on mobile) ── */}
                        <div
                            className={`${
                                selectedEmailId ? "hidden md:flex" : "flex"
                            } w-full md:w-[380px] lg:w-[420px] shrink-0 border-r border-slate-200/80 flex-col bg-white overflow-hidden`}
                        >
                    {/* List Toolbar */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200/80 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleSelectAll}
                                title="Select All"
                                className="p-1 text-slate-500 hover:text-slate-800 rounded cursor-pointer"
                            >
                                {selectedIds.size > 0 && selectedIds.size === filteredEmails.length ? (
                                    <CheckSquare className="w-4 h-4 text-[#2D79C7]" />
                                ) : (
                                    <Square className="w-4 h-4" />
                                )}
                            </button>

                            {selectedIds.size > 0 ? (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-slate-600">
                                        {selectedIds.size} selected
                                    </span>
                                    <button
                                        onClick={() => handleBatchAction("markRead")}
                                        title="Mark as Read"
                                        className="p-1 hover:bg-slate-200/80 rounded text-slate-600 hover:text-slate-900 cursor-pointer"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleBatchAction("markUnread")}
                                        title="Mark as Unread"
                                        className="p-1 hover:bg-slate-200/80 rounded text-slate-600 hover:text-slate-900 cursor-pointer"
                                    >
                                        <EyeOff className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleBatchAction("trash")}
                                        title="Move to Trash"
                                        className="p-1 hover:bg-rose-50 rounded text-rose-500 hover:text-rose-700 cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    {currentFolder === "trash" && (
                                        <button
                                            onClick={() => handleBatchAction("restore")}
                                            title="Restore from Trash"
                                            className="p-1 hover:bg-emerald-50 rounded text-emerald-600 cursor-pointer"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <span className="text-xs font-semibold text-slate-600 capitalize">
                                    {currentFolder} ({filteredEmails.length})
                                </span>
                            )}
                        </div>

                        {/* Filter pills: All, Unread, Starred */}
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                            <button
                                onClick={() => setFilterType("all")}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                    filterType === "all"
                                        ? "bg-white text-[#2D79C7] shadow-2xs"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterType("unread")}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                    filterType === "unread"
                                        ? "bg-white text-[#2D79C7] shadow-2xs"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Unread
                            </button>
                            <button
                                onClick={() => setFilterType("starred")}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                    filterType === "starred"
                                        ? "bg-white text-[#2D79C7] shadow-2xs"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                Starred
                            </button>
                        </div>
                    </div>

                    {/* Email List Scroll View */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400 space-y-3">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#2D79C7]" />
                                <p className="text-xs">Loading conversations...</p>
                            </div>
                        ) : filteredEmails.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 space-y-3">
                                <InboxIcon className="w-10 h-10 mx-auto text-slate-300" />
                                <h3 className="text-sm font-semibold text-slate-600">No emails found</h3>
                                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                                    {searchQuery
                                        ? `No results matching "${searchQuery}"`
                                        : "Your folder is currently empty. Enjoy the clean inbox!"}
                                </p>
                            </div>
                        ) : (
                            filteredEmails.map((item) => {
                                const isSelected = selectedEmailId === item._id;
                                const isChecked = selectedIds.has(item._id);

                                return (
                                    <div
                                        key={item._id}
                                        onClick={() => handleSelectEmail(item)}
                                        className={`group relative p-3.5 transition-all cursor-pointer border-l-4 ${
                                            isSelected
                                                ? "bg-blue-50/70 border-[#2D79C7]"
                                                : !item.isRead
                                                ? "bg-white border-blue-500 hover:bg-slate-50/80"
                                                : "bg-slate-50/20 border-transparent hover:bg-slate-50"
                                        }`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            {/* Checkbox & Star buttons */}
                                            <div className="flex items-center gap-1.5 pt-0.5 shrink-0">
                                                <button
                                                    onClick={(e) => toggleSelectOne(e, item._id)}
                                                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                                >
                                                    {isChecked ? (
                                                        <CheckSquare className="w-3.5 h-3.5 text-[#2D79C7]" />
                                                    ) : (
                                                        <Square className="w-3.5 h-3.5" />
                                                    )}
                                                </button>

                                                <button
                                                    onClick={(e) => handleToggleStar(e, item)}
                                                    className="cursor-pointer"
                                                >
                                                    <Star
                                                        className={`w-3.5 h-3.5 ${
                                                            item.isStarred
                                                                ? "fill-amber-400 text-amber-400"
                                                                : "text-slate-300 group-hover:text-slate-400"
                                                        }`}
                                                    />
                                                </button>
                                            </div>

                                            {/* Main message snippet */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-1 mb-1">
                                                    <span
                                                        className={`text-xs truncate ${
                                                            !item.isRead
                                                                ? "font-bold text-slate-900"
                                                                : "font-semibold text-slate-700"
                                                        }`}
                                                    >
                                                        {currentFolder === "sent" ? `To: ${item.to?.join(", ")}` : item.senderName}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 shrink-0">
                                                        {formatDate(item.createdAt)}
                                                    </span>
                                                </div>

                                                <h4
                                                    className={`text-xs truncate mb-1 ${
                                                        !item.isRead
                                                            ? "font-bold text-slate-900"
                                                            : "font-normal text-slate-700"
                                                    }`}
                                                >
                                                    {item.subject || "(No Subject)"}
                                                </h4>

                                                <p className="text-[11px] text-slate-500 truncate line-clamp-1">
                                                    {item.snippet || "No text preview"}
                                                </p>

                                                {/* Badges row: Priority, Attachments */}
                                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                    {getPriorityBadge(item.priority)}
                                                    {item.attachments && item.attachments.length > 0 && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium border border-slate-200">
                                                            <Paperclip className="w-3 h-3 text-slate-400" />
                                                            {item.attachments.length}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hover Quick Action Icons */}
                                        <div className="absolute right-3 top-3 hidden group-hover:flex items-center gap-1 bg-white/90 shadow-sm border border-slate-200 px-1 py-0.5 rounded-lg">
                                            <button
                                                onClick={(e) => handleToggleRead(e, item)}
                                                title={item.isRead ? "Mark Unread" : "Mark Read"}
                                                className="p-1 text-slate-500 hover:text-[#2D79C7] rounded cursor-pointer"
                                            >
                                                {item.isRead ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteSingle(e, item)}
                                                title="Delete"
                                                className="p-1 text-slate-500 hover:text-rose-600 rounded cursor-pointer"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ── RIGHT PANE: EMAIL DETAIL / CONVERSATION THREAD (FLEX-1) ── */}
                <div
                    className={`${
                        selectedEmailId ? "flex" : "hidden md:flex"
                    } flex-1 flex-col bg-slate-50/30 overflow-hidden`}
                >
                    {loadingDetail ? (
                        <div className="flex-1 flex items-center justify-center text-slate-400 space-y-2">
                            <div className="text-center">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2D79C7] mb-2" />
                                <p className="text-xs">Loading message details...</p>
                            </div>
                        </div>
                    ) : !activeEmail ? (
                        /* Empty state when no email is chosen */
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2D79C7] flex items-center justify-center mb-4">
                                <InboxIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-700">No conversation selected</h3>
                            <p className="text-xs text-slate-400 max-w-sm mt-1">
                                Choose an email thread from the list on the left to read, reply, or manage its attachments.
                            </p>
                        </div>
                    ) : (
                        /* Complete Email Reader */
                        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white max-w-full">
                            {/* Email Action Header */}
                            <div className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200/80 bg-white">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedEmailId(null);
                                            setActiveEmail(null);
                                        }}
                                        title="Back to List"
                                        className="md:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>

                                    <button
                                        onClick={(e) => handleToggleStar(e, activeEmail)}
                                        title={activeEmail.isStarred ? "Starred" : "Star"}
                                        className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg cursor-pointer"
                                    >
                                        <Star
                                            className={`w-4 h-4 ${
                                                activeEmail.isStarred ? "fill-amber-400 text-amber-400" : ""
                                            }`}
                                        />
                                    </button>

                                    <button
                                        onClick={(e) => handleToggleRead(e, activeEmail)}
                                        title="Mark as unread"
                                        className="p-1.5 text-slate-400 hover:text-[#2D79C7] rounded-lg cursor-pointer"
                                    >
                                        <EyeOff className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={(e) => handleDeleteSingle(e, activeEmail)}
                                        title="Delete"
                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <button
                                        onClick={() => handleReplyInModal(activeEmail)}
                                        title="Reply"
                                        className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                                    >
                                        <Reply className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Reply</span>
                                    </button>
                                    <button
                                        onClick={() => handleForwardEmail(activeEmail)}
                                        title="Forward"
                                        className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                                    >
                                        <Forward className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Forward</span>
                                    </button>
                                    <button
                                        onClick={() => window.print()}
                                        title="Print"
                                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer hidden sm:block"
                                    >
                                        <Printer className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Conversation Content */}
                            <div className="flex-1 overflow-y-auto overflow-x-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-full scrollbar-thin">
                                {/* Subject & Meta */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h2 className="text-lg font-bold text-slate-900 leading-snug">
                                            {activeEmail.subject || "(No Subject)"}
                                        </h2>
                                        {getPriorityBadge(activeEmail.priority)}
                                    </div>
                                </div>

                                {/* Quick Action Banner for DSR Reminder Emails */}
                                {(activeEmail.labels?.includes("DSR-Reminder") ||
                                    activeEmail.subject?.toLowerCase().includes("dsr")) && (
                                    <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xs">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-[#2D79C7] text-white flex items-center justify-center shrink-0 shadow-xs">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                                                    Daily Status Report (DSR) Due
                                                </h4>
                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                    Click to open prefilled DSR compose template with tasks, blockers, and tomorrow's plan.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => openDsrCompose()}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-[#2D79C7] text-white rounded-xl text-xs font-semibold shadow-xs hover:bg-[#256bb3] transition-all cursor-pointer shrink-0"
                                        >
                                            <PenSquare className="w-3.5 h-3.5" />
                                            <span>Write DSR Now</span>
                                        </button>
                                    </div>
                                )}

                                {/* Quick Action Banner for Leave Application Emails */}
                                {(activeEmail.labels?.some(l => l.toLowerCase().includes("leave")) ||
                                    activeEmail.subject?.toLowerCase().includes("leave application") ||
                                    activeEmail.subject?.toLowerCase().includes("partial leave")) && (() => {
                                    const leaveIdLabel = activeEmail.labels?.find(l => l.startsWith("LeaveId:"));
                                    const extractedLeaveId = leaveIdLabel ? leaveIdLabel.replace("LeaveId:", "") : null;
                                    const matchingLeave = leaves.find(l => 
                                        (extractedLeaveId && l._id === extractedLeaveId) ||
                                        (l.name && activeEmail.senderName && l.name.toLowerCase() === activeEmail.senderName.toLowerCase()) ||
                                        (l.code && activeEmail.snippet && activeEmail.snippet.includes(l.code))
                                    );

                                    if (!matchingLeave) return null;
                                    const isPending = (matchingLeave.rawStatus || matchingLeave.status || "").toLowerCase() === "pending";
                                    const isApproved = (matchingLeave.rawStatus || matchingLeave.status || "").toLowerCase() === "approved";
                                    const isRejected = (matchingLeave.rawStatus || matchingLeave.status || "").toLowerCase() === "rejected";

                                    return (
                                        <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-blue-50/90 border border-emerald-200/80 rounded-2xl p-4 shadow-2xs space-y-3 animate-fadeIn">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                                        <CheckSquare className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                                                                {matchingLeave.type || "Leave Application"} Review
                                                            </h4>
                                                            {isPending ? (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                                                    ● Pending Review
                                                                </span>
                                                            ) : isApproved ? (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                    ✓ Approved
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                                                    ✕ Rejected
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-slate-600 mt-0.5">
                                                            <span className="font-bold text-slate-800">{matchingLeave.name}</span> ({matchingLeave.dept}) • {matchingLeave.duration || `${matchingLeave.totalDays} Days`} ({matchingLeave.start}{matchingLeave.end && matchingLeave.end !== matchingLeave.start ? ` to ${matchingLeave.end}` : ''})
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Direct Action Buttons */}
                                                {isPending ? (
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleLeaveAction(matchingLeave._id, "approved")}
                                                            disabled={processingLeaveId === matchingLeave._id}
                                                            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            <span>{processingLeaveId === matchingLeave._id ? "Processing..." : "Approve 🟢"}</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleLeaveAction(matchingLeave._id, "rejected")}
                                                            disabled={processingLeaveId === matchingLeave._id}
                                                            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold disabled:opacity-50 transition-all cursor-pointer"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                            <span>Reject 🔴</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-500">
                                                        {isApproved ? "Approved by Management" : "Application declined"}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Main Email Message Card */}
                                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 max-w-full overflow-hidden">
                                    {/* Sender & Recipient Bar */}
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 border-b border-slate-100 pb-3 sm:pb-4">
                                        <div className="flex items-center gap-3">
                                            {activeEmail.senderAvatar ? (
                                                <img
                                                    src={activeEmail.senderAvatar}
                                                    alt={activeEmail.senderName}
                                                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#2D79C7] to-blue-400 text-white flex items-center justify-center font-bold text-sm shadow-inner">
                                                    {activeEmail.senderName ? activeEmail.senderName[0] : "U"}
                                                </div>
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-900">
                                                        {activeEmail.senderName}
                                                    </span>
                                                    <span className="text-xs text-slate-400 truncate max-w-[150px] sm:max-w-none">
                                                        &lt;{activeEmail.senderEmail}&gt;
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-slate-500 mt-0.5">
                                                    <span>To: {activeEmail.to?.join(", ") || "me"}</span>
                                                    {activeEmail.cc && activeEmail.cc.length > 0 && (
                                                        <span className="ml-2">| Cc: {activeEmail.cc.join(", ")}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right shrink-0">
                                            <span className="text-xs text-slate-400 font-medium">
                                                {formatFullDate(activeEmail.createdAt)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Email Body Content with Horizontal Touch Scrolling */}
                                    <div
                                        className="prose prose-sm max-w-none text-slate-800 text-sm leading-relaxed overflow-x-auto max-w-full scrollbar-thin"
                                        style={{ WebkitOverflowScrolling: "touch" }}
                                        dangerouslySetInnerHTML={{
                                            __html: activeEmail.body || "<p>(No content)</p>",
                                        }}
                                    />

                                    {/* Attachments Section (if present) */}
                                    {activeEmail.attachments && activeEmail.attachments.length > 0 && (
                                        <div className="pt-4 border-t border-slate-100 space-y-2">
                                            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                                                Attachments ({activeEmail.attachments.length})
                                            </span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {activeEmail.attachments.map((att, i) => (
                                                    <a
                                                        key={i}
                                                        href={att.url}
                                                        download={att.name || "attachment"}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-blue-50/50 hover:border-[#2D79C7]/40 transition-all group"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-[#2D79C7]">
                                                                <FileText className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-semibold text-slate-800 truncate">
                                                                    {att.name}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400">
                                                                    {formatFileSize(att.size)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Download className="w-4 h-4 text-slate-400 group-hover:text-[#2D79C7] shrink-0" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Thread Replies (if any) */}
                                {threadReplies.map((replyItem) => (
                                    <div
                                        key={replyItem._id}
                                        className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-3"
                                    >
                                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs">
                                                    {replyItem.senderName ? replyItem.senderName[0] : "U"}
                                                </div>
                                                <div>
                                                    <span className="text-xs font-bold text-slate-800">
                                                        {replyItem.senderName}
                                                    </span>
                                                    <p className="text-[10px] text-slate-400">
                                                        {replyItem.senderEmail}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[11px] text-slate-400">
                                                {formatFullDate(replyItem.createdAt)}
                                            </span>
                                        </div>
                                        <div
                                            className="text-xs text-slate-700 leading-relaxed overflow-x-auto max-w-full scrollbar-thin"
                                            style={{ WebkitOverflowScrolling: "touch" }}
                                            dangerouslySetInnerHTML={{
                                                __html: replyItem.body || "",
                                            }}
                                        />
                                    </div>
                                ))}

                                {/* Inline Quick Reply Box */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                            <Reply className="w-3.5 h-3.5 text-[#2D79C7]" />
                                            Quick Reply to {activeEmail.senderName}
                                        </span>
                                    </div>
                                    <textarea
                                        rows={3}
                                        value={replyBody}
                                        onChange={(e) => setReplyBody(e.target.value)}
                                        placeholder={`Write a quick reply to ${activeEmail.senderName}...`}
                                        className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D79C7]/20 focus:border-[#2D79C7] transition-all"
                                    />
                                    <div className="flex items-center justify-between">
                                        <button
                                            onClick={() => handleReplyInModal(activeEmail)}
                                            className="text-xs text-[#2D79C7] hover:underline font-semibold cursor-pointer"
                                        >
                                            Open Full Editor with Attachments
                                        </button>
                                        <button
                                            onClick={handleSendQuickReply}
                                            disabled={sendingReply || !replyBody.trim()}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-[#2D79C7] text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-[#256bb3] disabled:opacity-50 transition-all cursor-pointer"
                                        >
                                            {sendingReply ? (
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Send className="w-3.5 h-3.5" />
                                            )}
                                            <span>Send Reply</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </>
        )}
    </div>

            {/* ─────────────────────────────────────────────
               COMPOSE EMAIL MODAL
            ───────────────────────────────────────────── */}
            {isComposeOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
                    <div
                        className={`bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col transition-all overflow-hidden ${
                            composeMaximized
                                ? "w-full h-full max-w-5xl"
                                : "w-[calc(100%-1rem)] sm:w-full max-w-2xl max-h-[88vh]"
                        }`}
                    >
                        {/* Compose Header - Clean White Background */}
                        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-200 text-slate-800">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-blue-50 text-[#2D79C7]">
                                    <PenSquare className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-bold text-slate-900 tracking-tight">New Message</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setComposeMaximized(!composeMaximized)}
                                    title={composeMaximized ? "Restore window" : "Maximize window"}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer text-slate-400 hover:text-slate-700 transition-colors"
                                >
                                    {composeMaximized ? (
                                        <Minimize2 className="w-4 h-4" />
                                    ) : (
                                        <Maximize2 className="w-4 h-4" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setIsComposeOpen(false)}
                                    title="Close"
                                    className="p-1.5 hover:bg-rose-50 rounded-lg cursor-pointer text-slate-400 hover:text-rose-600 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Compose Form */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
                            {/* "To" Field with Recipient Chips & Directory Autocomplete */}
                            <div className="space-y-1 relative">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-slate-600">Recipients (To)</label>
                                    <div className="flex items-center gap-2 text-[11px]">
                                        {!showCc && (
                                            <button
                                                type="button"
                                                onClick={() => setShowCc(true)}
                                                className="text-[#2D79C7] hover:underline font-semibold cursor-pointer"
                                            >
                                                + Cc
                                            </button>
                                        )}
                                        {!showBcc && (
                                            <button
                                                type="button"
                                                onClick={() => setShowBcc(true)}
                                                className="text-[#2D79C7] hover:underline font-semibold cursor-pointer"
                                            >
                                                + Bcc
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[42px] focus-within:ring-2 focus-within:ring-[#2D79C7]/20 focus-within:border-[#2D79C7] transition-all">
                                    {composeForm.to.map((email) => (
                                        <span
                                            key={email}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-white border border-slate-200 text-slate-800 shadow-2xs"
                                        >
                                            <span>{email}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeRecipientChip("to", email)}
                                                className="text-slate-400 hover:text-rose-500 cursor-pointer"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}

                                    <input
                                        type="text"
                                        placeholder={composeForm.to.length === 0 ? "Type colleague name or email..." : ""}
                                        value={toInput}
                                        onChange={(e) => setToInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === ",") {
                                                e.preventDefault();
                                                addRecipientChip("to", toInput);
                                            }
                                        }}
                                        className="flex-1 min-w-[150px] bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                                    />
                                </div>

                                {/* Autocomplete Suggestion Dropdown */}
                                {contactSuggestions.length > 0 && (
                                    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-52 overflow-y-auto">
                                        {contactSuggestions.map((c) => (
                                            <div
                                                key={c._id}
                                                onClick={() => {
                                                    addRecipientChip("to", c.email);
                                                    setToInput("");
                                                }}
                                                className="flex items-center justify-between p-2.5 hover:bg-blue-50/60 cursor-pointer transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-full bg-[#2D79C7]/10 text-[#2D79C7] flex items-center justify-center font-bold text-xs uppercase">
                                                        {c.fullName ? c.fullName[0] : "U"}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">{c.fullName}</p>
                                                        <p className="text-[10px] text-slate-400">{c.email}</p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {c.designation || c.department || "Team"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* CC Field */}
                            {showCc && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600">Cc</label>
                                    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[38px]">
                                        {composeForm.cc.map((email) => (
                                            <span
                                                key={email}
                                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-800"
                                            >
                                                <span>{email}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeRecipientChip("cc", email)}
                                                    className="text-slate-400 hover:text-rose-500 cursor-pointer"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            type="text"
                                            placeholder="Add Cc email and hit Enter..."
                                            value={ccInput}
                                            onChange={(e) => setCcInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === ",") {
                                                    e.preventDefault();
                                                    addRecipientChip("cc", ccInput);
                                                }
                                            }}
                                            className="flex-1 min-w-[150px] bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* BCC Field */}
                            {showBcc && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600">Bcc</label>
                                    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[38px]">
                                        {composeForm.bcc.map((email) => (
                                            <span
                                                key={email}
                                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-800"
                                            >
                                                <span>{email}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeRecipientChip("bcc", email)}
                                                    className="text-slate-400 hover:text-rose-500 cursor-pointer"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            type="text"
                                            placeholder="Add Bcc email and hit Enter..."
                                            value={bccInput}
                                            onChange={(e) => setBccInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === ",") {
                                                    e.preventDefault();
                                                    addRecipientChip("bcc", bccInput);
                                                }
                                            }}
                                            className="flex-1 min-w-[150px] bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Subject & Priority */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <div className="sm:col-span-3 space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600">Subject</label>
                                    <input
                                        type="text"
                                        placeholder="Email subject..."
                                        value={composeForm.subject}
                                        onChange={(e) =>
                                            setComposeForm((prev) => ({ ...prev, subject: e.target.value }))
                                        }
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D79C7]/20 focus:border-[#2D79C7] transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600">Priority</label>
                                    <select
                                        value={composeForm.priority}
                                        onChange={(e) =>
                                            setComposeForm((prev) => ({ ...prev, priority: e.target.value }))
                                        }
                                        className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D79C7]/20 focus:border-[#2D79C7] transition-all cursor-pointer font-medium"
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                        <option value="low">Low</option>
                                    </select>
                                </div>
                            </div>

                            {/* Email Body Message - Rich Text Editor */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-bold text-slate-600">Message Content</label>
                                    <span className="text-[10px] text-slate-400 font-medium">Rich Text (Bold, Italic, Links, Lists)</span>
                                </div>
                                <RichTextEditor
                                    value={composeForm.body}
                                    onChange={(content) =>
                                        setComposeForm((prev) => ({ ...prev, body: content }))
                                    }
                                    placeholder="Write your email here... Format text using toolbar above or use Ctrl+B, Ctrl+I, Ctrl+K"
                                    minHeight={composeMaximized ? "340px" : "180px"}
                                    maxHeight={composeMaximized ? "520px" : "320px"}
                                />
                            </div>

                            {/* Attached Files List */}
                            {composeForm.attachments.length > 0 && (
                                <div className="space-y-1.5">
                                    <span className="text-[11px] font-bold text-slate-600">
                                        Attached Files ({composeForm.attachments.length})
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        {composeForm.attachments.map((file, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-[#2D79C7]"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                <span className="truncate max-w-[160px] font-medium">{file.name}</span>
                                                <span className="text-[10px] text-slate-400">
                                                    ({formatFileSize(file.size)})
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAttachedFile(i)}
                                                    className="text-slate-400 hover:text-rose-500 cursor-pointer ml-1"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Compose Footer Actions */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-2">
                                {/* Hidden file input */}
                                <input
                                    type="file"
                                    multiple
                                    ref={fileInputRef}
                                    onChange={handleFileSelected}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer transition-all"
                                >
                                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Attach Files</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSaveAsDraft}
                                    className="px-3 py-2 rounded-xl hover:bg-slate-200/80 text-slate-600 text-xs font-semibold cursor-pointer transition-all"
                                >
                                    Save Draft
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsComposeOpen(false)}
                                    className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-700 text-xs font-semibold cursor-pointer"
                                >
                                    Discard
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSendCompose}
                                    disabled={sendingCompose}
                                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#2D79C7] to-[#1E60A8] text-white rounded-xl text-xs font-bold shadow-md hover:from-[#256bb3] hover:to-[#174d87] disabled:opacity-50 transition-all cursor-pointer"
                                >
                                    {sendingCompose ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    <span>Send Email</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inbox;
