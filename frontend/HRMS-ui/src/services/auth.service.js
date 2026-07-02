import axios from "axios";

const API = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
    withCredentials: true,
});

export const loginUser = async (email, password) => {
    return API.post("/users/login", { email, password });
};

export const logoutUser = async () => {
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

export default API;
