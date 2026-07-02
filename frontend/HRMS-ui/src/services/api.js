import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BASE_URL;

if (!API_BASE_URL && typeof window !== "undefined") {
    console.error(
        "⚠️ VITE_BASE_URL is not defined. API requests will fail.\n" +
        "Add VITE_BASE_URL to your .env file, e.g.:\n" +
        "VITE_BASE_URL=http://localhost:5000/api"
    );
}

const API = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (!API_BASE_URL) {
            console.error("API configuration error: VITE_BASE_URL environment variable is missing.");
        }
        return Promise.reject(error);
    }
);

export default API;
