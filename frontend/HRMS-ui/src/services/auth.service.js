import API from "./api";

export const loginUser = async (email, password) => {
    return API.post("/users/login", { email, password });
};

export const logoutUser = async () => {
    try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    } catch (e) {}
    return API.post("/users/logout");
};

export const getCurrentUser = async () => {
    return API.get("/users/me");
};

export const uploadProfilePicture = async (formData) => {
    return API.post("/users/upload-profile-picture", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
};

export const updateProfilePicture = async (url) => {
    return API.put("/users/update-profile-picture", { profilePicture: url });
};

export const uploadDocumentFile = async (formData) => {
    return API.post("/users/upload-document", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
};

export const changeUserPassword = async (data) => {
    return API.put("/users/change-password", data);
};

export const updateUserPreferences = async (preferences) => {
    return API.put("/users/preferences", { preferences });
};

export const forgotPasswordRequest = async (email) => {
    return API.post("/users/forgot-password", { email });
};

export const verifyResetToken = async (token, email) => {
    return API.get("/users/verify-reset-token", {
        params: { token, email }
    });
};

export const resetUserPassword = async ({ token, email, password }) => {
    return API.post("/users/reset-password", { token, email, password });
};

export default API;
