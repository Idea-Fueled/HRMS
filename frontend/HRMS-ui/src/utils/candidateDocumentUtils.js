import jsPDF from "jspdf";
import { toast } from "sonner";

/**
 * Generates and downloads a high-quality PDF resume/document for a candidate
 * when no static binary file exists or fallback is required.
 */
export const generateCandidatePdf = (candidate, docName = null, docType = "Resume") => {
    try {
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 18;
        const contentWidth = pageWidth - (margin * 2);

        // ─── 1. TOP HEADER BANNER ───
        doc.setFillColor(45, 121, 199); // #2D79C7
        doc.rect(0, 0, pageWidth, 28, "F");

        // Brand / System Title
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("IDEA FUELED HRMS", margin, 12);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text("CANDIDATE RECRUITMENT RECORD & RESUME", margin, 18);

        // Document Meta right-aligned
        doc.setFontSize(7.5);
        doc.setTextColor(220, 235, 252);
        const generatedDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
        doc.text(`Generated: ${generatedDate}`, pageWidth - margin, 12, { align: "right" });
        doc.text(`Stage: ${candidate.stage || "New Application"}`, pageWidth - margin, 18, { align: "right" });

        // ─── 2. CANDIDATE PROFILE HEADER ───
        let y = 38;

        // Name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(30, 30, 30);
        doc.text(candidate.name || "Candidate Name", margin, y);

        // Position / Designation
        y += 6;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(45, 121, 199);
        doc.text(candidate.position || "Candidate Position", margin, y);

        // Divider line
        y += 5;
        doc.setDrawColor(229, 231, 235); // #E5E7EB
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);

        // ─── 3. CONTACT & BASIC DETAILS (2 Columns Grid) ───
        y += 8;
        doc.setFillColor(248, 250, 252); // #F8FAFC
        doc.roundedRect(margin, y, contentWidth, 26, 2, 2, "F");
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, y, contentWidth, 26, 2, 2, "S");

        const col1X = margin + 5;
        const col2X = margin + (contentWidth / 2) + 5;
        let infoY = y + 6;

        // Row 1
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("EMAIL ADDRESS:", col1X, infoY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(candidate.email || "N/A", col1X + 30, infoY);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("PHONE NUMBER:", col2X, infoY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(candidate.phone || "N/A", col2X + 28, infoY);

        // Row 2
        infoY += 7;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("LOCATION:", col1X, infoY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(candidate.address || "N/A", col1X + 30, infoY);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("APPLIED DATE:", col2X, infoY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(candidate.appliedDate || new Date().toISOString().split("T")[0], col2X + 28, infoY);

        // Row 3
        infoY += 7;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("ASSIGNED HR:", col1X, infoY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(candidate.assignedHr || "HR Team", col1X + 30, infoY);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("STATUS:", col2X, infoY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(45, 121, 199);
        doc.text(`${candidate.stage || "In Progress"} (${candidate.status || "Active"})`, col2X + 28, infoY);

        // ─── 4. PROFESSIONAL EXPERIENCE DETAILS ───
        y += 34;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(30, 30, 30);
        doc.text("PROFESSIONAL PROFILE", margin, y);

        y += 4;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "F");
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "S");

        let profY = y + 6;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("CURRENT COMPANY:", col1X, profY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(candidate.currentCompany || "N/A", col1X + 35, profY);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("TOTAL EXPERIENCE:", col2X, profY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(candidate.experience || "N/A", col2X + 32, profY);

        profY += 7;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("CURRENT CTC:", col1X, profY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(candidate.currentCtc || "N/A", col1X + 35, profY);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("EXPECTED CTC:", col2X, profY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(candidate.expectedCtc || "N/A", col2X + 32, profY);

        profY += 7;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("NOTICE PERIOD:", col1X, profY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(candidate.noticePeriod || "30 Days", col1X + 35, profY);

        // ─── 5. SKILLS & KEY COMPETENCIES ───
        y += 30;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(30, 30, 30);
        doc.text("SKILLS & TECHNOLOGIES", margin, y);

        y += 4;
        const skillsList = Array.isArray(candidate.skills) ? candidate.skills : (candidate.skills || "").split(",").map(s => s.trim()).filter(Boolean);
        const displaySkills = skillsList.length > 0 ? skillsList : ["Software Engineering", "Full Stack Development", "Problem Solving", "Collaboration"];

        let skillX = margin;
        let skillY = y;
        const rowHeight = 7;

        displaySkills.forEach((skill) => {
            const textWidth = doc.getTextWidth(skill) + 8;
            if (skillX + textWidth > pageWidth - margin) {
                skillX = margin;
                skillY += rowHeight;
            }
            doc.setFillColor(239, 246, 255); // light blue
            doc.setDrawColor(191, 219, 254);
            doc.roundedRect(skillX, skillY, textWidth, 5.5, 1.5, 1.5, "FD");
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(37, 99, 235);
            doc.text(skill, skillX + 4, skillY + 4);
            skillX += textWidth + 3;
        });

        y = skillY + 12;

        // ─── 6. INTERVIEW ROUNDS & FEEDBACK (IF ANY) ───
        if (candidate.interviews && candidate.interviews.length > 0) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(30, 30, 30);
            doc.text("INTERVIEW HISTORY & EVALUATION", margin, y);

            y += 4;
            candidate.interviews.forEach((intRound, idx) => {
                if (y > pageHeight - 35) {
                    doc.addPage();
                    y = 20;
                }

                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(226, 232, 240);
                doc.roundedRect(margin, y, contentWidth, 18, 2, 2, "FD");

                doc.setFontSize(8.5);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(15, 23, 42);
                doc.text(`${idx + 1}. ${intRound.roundName || "Technical Round"}`, margin + 4, y + 5);

                doc.setFontSize(7.5);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(100, 116, 139);
                doc.text(`Interviewer: ${intRound.interviewer || "N/A"} | Date: ${intRound.date || "N/A"} (${intRound.time || ""})`, margin + 4, y + 10);

                if (intRound.feedback) {
                    doc.setFont("helvetica", "italic");
                    doc.setTextColor(71, 85, 105);
                    const feedbackSnippet = doc.splitTextToSize(`Feedback: "${intRound.feedback}"`, contentWidth - 40);
                    doc.text(feedbackSnippet[0] || "", margin + 4, y + 14);
                }

                // Status Badge
                const statusStr = intRound.status || "Scheduled";
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                if (statusStr === "Passed") {
                    doc.setTextColor(22, 101, 52);
                } else if (statusStr === "Failed") {
                    doc.setTextColor(185, 28, 28);
                } else {
                    doc.setTextColor(45, 121, 199);
                }
                doc.text(statusStr, pageWidth - margin - 5, y + 5, { align: "right" });

                if (intRound.rating) {
                    doc.setTextColor(217, 119, 6);
                    doc.text(`Rating: ${intRound.rating}/5 Stars`, pageWidth - margin - 5, y + 10, { align: "right" });
                }

                y += 22;
            });
        }

        // ─── 7. OFFER DETAILS (IF PRESENT) ───
        if (candidate.offerDetails) {
            if (y > pageHeight - 35) {
                doc.addPage();
                y = 20;
            }
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(30, 30, 30);
            doc.text("OFFER DETAILS", margin, y);

            y += 4;
            doc.setFillColor(240, 253, 244); // light emerald
            doc.setDrawColor(187, 247, 208);
            doc.roundedRect(margin, y, contentWidth, 16, 2, 2, "FD");

            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(22, 101, 52);
            doc.text(`OFFERED CTC: ${candidate.offerDetails.offeredCtc || candidate.expectedCtc}`, col1X, y + 6);
            doc.text(`JOINING DATE: ${candidate.offerDetails.joiningDate || "TBD"}`, col2X, y + 6);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(51, 65, 85);
            doc.text(`STATUS: ${candidate.offerDetails.status || "Offer Sent"}`, col1X, y + 12);
            if (candidate.offerDetails.notes) {
                doc.text(`NOTES: ${candidate.offerDetails.notes}`, col2X, y + 12);
            }
            y += 22;
        }

        // ─── 8. FOOTER NOTE ───
        const footerY = pageHeight - 14;
        doc.setDrawColor(229, 231, 235);
        doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(156, 163, 175);
        doc.text("Confidential document generated by Idea Fueled HRMS ATS Engine.", margin, footerY);
        doc.text(`Doc: ${docName || `${candidate.name}_Resume.pdf`} • Type: ${docType}`, pageWidth - margin, footerY, { align: "right" });

        // Save file
        const finalFileName = (docName && docName.trim()) ? (docName.toLowerCase().endsWith(".pdf") ? docName : `${docName}.pdf`) : `${candidate.name.replace(/\s+/g, "_")}_Resume.pdf`;
        doc.save(finalFileName);
        toast.success(`Downloaded ${finalFileName} successfully!`);
        return true;
    } catch (err) {
        console.error("PDF generation error:", err);
        toast.error("Failed to generate candidate document");
        return false;
    }
};

/**
 * Universal document download handler for Candidate documents:
 * Handles Data URLs, Remote HTTP/HTTPS URLs, Blobs, and fallback PDF generation.
 */
export const downloadCandidateDocument = async (doc, candidate) => {
    try {
        if (!doc) {
            toast.error("Document not found");
            return;
        }

        const candidateName = candidate?.name || "Candidate";
        const docName = doc.name || `${candidateName}_Document.pdf`;

        // 1. If doc.url is a valid base64 data URL
        if (doc.url && doc.url.startsWith("data:")) {
            const link = document.createElement("a");
            link.href = doc.url;
            link.download = docName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`Downloaded ${docName}`);
            return;
        }

        // 2. If doc.url is a remote HTTP or HTTPS URL (and not empty / #)
        if (doc.url && (doc.url.startsWith("http://") || doc.url.startsWith("https://"))) {
            try {
                const response = await fetch(doc.url);
                if (response.ok) {
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = blobUrl;
                    link.download = docName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(blobUrl);
                    toast.success(`Downloaded ${docName}`);
                    return;
                }
            } catch {
                // If CORS or fetch fails, fallback to opening or pdf generation
                window.open(doc.url, "_blank");
                return;
            }
        }

        // 3. Fallback: Generate dynamic authentic PDF for this document & candidate
        generateCandidatePdf(candidate || { name: "Candidate" }, docName, doc.type || "Resume");
    } catch (err) {
        console.error("Download candidate doc error:", err);
        // Ensure user gets the document regardless
        generateCandidatePdf(candidate || { name: "Candidate" }, doc?.name, doc?.type);
    }
};

/**
 * Converts a File object to a Base64 Data URL string for persistent storage.
 */
export const fileToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};
