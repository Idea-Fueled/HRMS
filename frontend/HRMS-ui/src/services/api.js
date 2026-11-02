import axios from "axios";

export const getApiBaseUrl = () => {
    let url = import.meta.env.VITE_BASE_URL;

    const isLocalhost = typeof window !== "undefined" && 
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    if (!url || typeof url !== "string" || !url.trim()) {
        url = isLocalhost ? "http://localhost:5000/api" : "https://backend.ideafueled.com/api";
    }

    url = url.trim().replace(/\/+$/, "");

    // Upgrade http to https when loaded over https to prevent Mixed Content errors
    if (typeof window !== "undefined" && window.location.protocol === "https:" && url.startsWith("http://backend.ideafueled.com")) {
        url = url.replace(/^http:\/\//i, "https://");
    }

    return url.endsWith("/api") ? url : `${url}/api`;
};

const API_BASE_URL = getApiBaseUrl();

const API = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

// Automatically attach Bearer token from localStorage to support Incognito mode and cross-domain cookies
API.interceptors.request.use(
    (config) => {
        try {
            const token = localStorage.getItem("token");
            if (token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (e) {
            // localStorage access might throw in strict sandboxes
        }
        return config;
    },
    (error) => Promise.reject(error)
);

API.interceptors.response.use(
    (response) => response,
    (error) => {
        return Promise.reject(error);
    }
);

export { API_BASE_URL };
export default API;
