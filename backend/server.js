import http from "http";
import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./config/db.js";
import attendanceRoutes from "./routes/attendance/attendance.routes.js";
import userRoutes from "./routes/users/user.routes.js";
import holidayRoutes from "./routes/holidays/holiday.route.js";
import leaveRoutes from "./routes/leaves/leave.routes.js";
import postRoutes from "./routes/posts/post.route.js";
import dashboardRoutes from "./routes/dashboard/dashboard.routes.js";
import pollRoutes from "./routes/polls/poll.route.js";
import teamRoutes from "./routes/team/team.route.js";
import employeeRoutes from "./routes/employees/employee.routes.js";
import documentRoutes from "./routes/documents/document.routes.js";
import shiftRoutes from "./routes/shifts/shift.route.js";
import hireRoutes from "./routes/hire/hire.routes.js";
import assetRoutes from "./routes/assets/asset.routes.js";
import offboardingOnboardingRoutes from "./routes/offboarding-onboarding/offboarding-onboarding.routes.js";
import payrollRoutes from "./routes/payroll/payroll.route.js";
import emailRoutes from "./routes/emails/email.routes.js";
import { initSocket } from "./socket/socket.js";
import { initDsrScheduler } from "./cron/dsrCron.js";
import { initProbationScheduler } from "./cron/probationCron.js";

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// Dynamic CORS — supports local dev and production via FRONTEND_URL env var
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176"
];
if (process.env.FRONTEND_URL) {
    const url = process.env.FRONTEND_URL.replace(/\/+$/, ""); // strip trailing slash
    allowedOrigins.push(url);
}

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

app.use("/api/users", userRoutes)
app.use("/api/attendance", attendanceRoutes)
app.use("/api/holidays", holidayRoutes)
app.use("/api/leaves", leaveRoutes);
app.use("/api/posts", postRoutes)
app.use("/api/dashboard", dashboardRoutes)
app.use("/api/polls", pollRoutes)
app.use("/api/team", teamRoutes)
app.use("/api/employees", employeeRoutes)
app.use("/api/documents", documentRoutes)
app.use("/api/shifts", shiftRoutes)
app.use("/api/hire", hireRoutes)
app.use("/api/assets", assetRoutes)
app.use("/api/offboarding-onboarding", offboardingOnboardingRoutes)
app.use("/api/payroll", payrollRoutes)
app.use("/api/emails", emailRoutes)

connectDB();
initSocket(httpServer, allowedOrigins);
initDsrScheduler();
initProbationScheduler();

app.get("/", (req, res) => {
    res.status(200).json({
        message: "Server is working"
    });
});

httpServer.listen(PORT, () => {
    console.log(`app listening on port ${PORT}`);
});