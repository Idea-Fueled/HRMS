import API from "./api";

export const getDocuments = async (params = {}) => {
    return API.get("/documents", { params });
};

export const createDocument = async (formData) => {
    return API.post("/documents", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
};

export const updateDocument = async (id, formData) => {
    return API.put(`/documents/${id}`, formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
};

export const deleteDocument = async (id) => {
    return API.delete(`/documents/${id}`);
};
