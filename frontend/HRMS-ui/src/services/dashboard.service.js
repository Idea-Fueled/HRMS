import API from "./api";

export const getDashboardData = async (employeeId) => {
    return API.get(`/dashboard/${employeeId}`)
}

export const clockIn = async (employeeId, workMode = "Office", wfhMessage = "", dailyWorkPlan = "") => {
    return API.post("/attendance/clock-in", { employeeId, workMode, wfhMessage, dailyWorkPlan })
}

export const clockOut = async (employeeId) => {
    return API.post("/attendance/clock-out", { employeeId })
}

export const getTodayAttendanceLogs = async (employeeId) => {
    return API.get(`/attendance/logs/today/${employeeId}`)
}

export const createPosts = async (postData) => {
    return API.post("/posts", postData)
}

export const getAllPosts = async () => {
    return API.get("/posts")
}

export const getUpcomingHolidays = async () => {
    return API.get("/holidays/upcoming")
}

export const getAllHolidays = async () => {
    return API.get("/holidays")
}

export const createHoliday = async (holidayData) => {
    return API.post("/holidays/create", holidayData)
}

export const updateHoliday = async (id, holidayData) => {
    return API.put(`/holidays/${id}`, holidayData)
}

export const deleteHoliday = async (id) => {
    return API.delete(`/holidays/${id}`)
}

export const getUpcomingBirthdays = async () => {
    return API.get("/users/upcoming-birthdays")
}

export const getLeaveSummary = async (employeeId) => {
    return API.get(`/leaves/summary/${employeeId}`)
}

export const applyLeave = async (leaveData) => {
    return API.post("/leaves", leaveData)
}

export const getLeaveHistory = async (employeeId) => {
    return API.get(`/leaves/history/${employeeId}`)
}

export const updateEmployeeLeaveBalance = async (employeeId, balanceData) => {
    return API.put(`/leaves/balance/${employeeId}`, balanceData)
}

export const requestCompOffCredit = async (creditData) => {
    return API.post("/leaves/request-comp-off-credit", creditData)
}

export const getAwayToday = async () => {
    return API.get("/users/away-today")
}


export const getPeopleEvents = async () => {
    return API.get("/users/people-events")
}

export const sendCelebrationWish = async ({ recipientId, eventType, message, meta }) => {
    return API.post("/users/send-wish", { recipientId, eventType, message, meta });
}

export const createPoll = async (pollData) => {
    return API.post("/polls", pollData)
}

export const getPolls = async () => {
    return API.get("/polls")
}

export const voteInPoll = async (pollId, optionIndex) => {
    return API.post(`/polls/${pollId}/vote`, { optionIndex })
}

export default API;