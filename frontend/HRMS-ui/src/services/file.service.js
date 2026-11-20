import API from "./api";

export const getFiles = async (params = {}) => {
    return API.get("/files", { params });
};

export const getFolders = async (parentId = null) => {
    const params = parentId ? { parentId } : {};
    return API.get("/files/folders", { params });
};

export const createFolder = async (name, parentId = null) => {
    return API.post("/files/folders", { name, parentId });
};

export const deleteFolder = async (idOrName) => {
    return API.delete(`/files/folders/${encodeURIComponent(idOrName)}`);
};

export const getStorageStats = async () => {
    return API.get("/files/stats");
};

export const uploadFiles = async (formData, onProgress) => {
    return API.post("/files/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        },
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    });
};

export const shareFile = async (id, userIds) => {
    return API.post(`/files/${id}/share`, { userIds });
};

export const createDocument = async ({ name, type, folderId, content }) => {
    return API.post("/files/create-document", { name, type, folderId, content });
};

export const updateDocumentContent = async (id, content) => {
    return API.put(`/files/${id}/content`, { content });
};

export const getShareableEmployees = async () => {
    return API.get("/files/employees");
};

export const updateFile = async (id, data) => {
    return API.put(`/files/${id}`, data);
};

export const deleteFile = async (id) => {
    return API.delete(`/files/${id}`);
};
