import API from "./api";

export const getMyFinances = async () => {
    return API.get("/users/me/finances");
};
