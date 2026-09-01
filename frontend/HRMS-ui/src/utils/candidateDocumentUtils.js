import { toast } from "sonner";

/**
 * Universal document download handler for Candidate documents:
 * Directly downloads the EXACT original file (PDF, DOC, DOCX, etc.) uploaded by the user.
 */
export const downloadCandidateDocument = async (doc, candidate) => {
    try {
        if (!doc) {
            toast.error("Document not found");
            return;
        }

        const candidateName = candidate?.name || "Candidate";
        const docName = doc.name || `${candidateName}_Document.pdf`;

        // 1. If doc.url contains Base64 Data URL (the actual raw file bytes)
        if (doc.url && doc.url.startsWith("data:")) {
            try {
                // Convert Data URL to Blob for reliable browser downloading
                const arr = doc.url.split(",");
                const mimeMatch = arr[0].match(/:(.*?);/);
                const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                const blob = new Blob([u8arr], { type: mime });
                const blobUrl = window.URL.createObjectURL(blob);

                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = docName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);

                toast.success(`Downloaded: ${docName}`);
                return;
            } catch (convErr) {
                // Fallback to direct anchor link with data URL
                const link = document.createElement("a");
                link.href = doc.url;
                link.download = docName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success(`Downloaded: ${docName}`);
                return;
            }
        }

        // 2. If doc.url is a valid remote HTTP or HTTPS URL
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
                    toast.success(`Downloaded: ${docName}`);
                    return;
                }
            } catch {
                window.open(doc.url, "_blank");
                return;
            }
        }

        // 3. If file content was never attached (old placeholder entry where doc.url is '#' or empty)
        toast.error(`Original file for "${docName}" was not uploaded. Please attach the file using the Upload Doc button.`, {
            duration: 5000
        });
    } catch (err) {
        console.error("Download candidate doc error:", err);
        toast.error("Failed to download document.");
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
