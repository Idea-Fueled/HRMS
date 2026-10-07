import API from "./api";

/**
 * Fetch emails with filters (folder, label, search, page, limit)
 */
export const fetchEmails = async (params = {}) => {
    return API.get("/emails", { params });
};

/**
 * Fetch full email conversation thread and mark as read
 */
export const fetchEmailById = async (id) => {
    return API.get(`/emails/${id}`);
};

/**
 * Send an email (supports multipart/form-data for attachments)
 */
export const sendEmailMessage = async (payload) => {
    if (payload instanceof FormData) {
        return API.post("/emails/send", payload, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    }
    return API.post("/emails/send", payload);
};

/**
 * Save draft
 */
export const saveEmailDraft = async (payload) => {
    return API.post("/emails/draft", payload);
};

/**
 * Update email status (isRead, isStarred, folder)
 */
export const updateEmailStatus = async (id, statusUpdates) => {
    return API.patch(`/emails/${id}/status`, statusUpdates);
};

/**
 * Delete email (move to trash or permanent delete)
 */
export const deleteEmailMessage = async (id) => {
    return API.delete(`/emails/${id}`);
};

/**
 * Perform bulk operations (markRead, markUnread, trash, star, unstar, restore, deletePermanent)
 */
export const batchEmailAction = async (emailIds, action) => {
    return API.post("/emails/batch", { emailIds, action });
};

/**
 * Lightweight unread email count check for badges
 */
export const fetchUnreadEmailCount = async () => {
    return API.get("/emails/unread-count");
};

/**
 * Fetch team members contact list for quick autocompletion
 */
export const fetchCompanyContacts = async () => {
    return API.get("/emails/contacts");
};
