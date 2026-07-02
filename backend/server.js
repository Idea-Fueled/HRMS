import express from "express"
import "dotenv/config"
import cookieParser from "cookie-parser";
import cors from "cors"
import connectDB from "./config/db.js";
import attendanceRoutes from "./routes/attendance/attendance.routes.js"
import userRoutes from "./routes/users/user.routes.js"
import holidayRoutes from "./routes/holidays/holiday.route.js"
import leaveRoutes from "./routes/leaves/leave.routes.js"
import postRoutes from "./routes/posts/post.route.js"
import dashboardRoutes from "./routes/dashboard/dashboard.routes.js"
import pollRoutes from "./routes/polls/poll.route.js"
import teamRoutes from "./routes/team/team.route.js"
import employeeRoutes from "./routes/employees/employee.routes.js"

const app = express();

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser());
const allowedOrigins = ["http://localhost:5175", "http://localhost:5173"];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
    if (process.env.FRONTEND_URL.endsWith("/")) {
        allowedOrigins.push(process.env.FRONTEND_URL.slice(0, -1));
    }
}

app.use(cors({
    origin: allowedOrigins,
    credentials: true
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

connectDB()

app.listen(process.env.PORT, () => {
    console.log(`app listening on port ${process.env.PORT}`)
})

app.get("/", (req, res) => {
    res.status(200).json({
        message: "Server is working"
    })
})