import API from "./api";

export const getFiles = async (params = {}) => {
    return API.get("/files", { params });
};

export const getFolders = async () => {
    return API.get("/files/folders");
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

export const updateFile = async (id, data) => {
    return API.put(`/files/${id}`, data);
};

export const deleteFile = async (id) => {
    return API.delete(`/files/${id}`);
};
