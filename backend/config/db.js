import mongoose from "mongoose";
import User from "../models/users/user.model.js";
import Attendance from "../models/attendance/attendance.model.js";
import Leave from "../models/leaves/leave.model.js";
import Performance from "../models/performance/performance.model.js";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("connected to database!")

        // Delete previously seeded mock data matching the company domain
        const mockUsers = await User.find({ email: { $regex: /@company\.com$/ } });
        if (mockUsers.length > 0) {
            const mockUserIds = mockUsers.map(u => u._id);
            console.log(`[Database Cleanup] Purging ${mockUserIds.length} legacy mock users and associated records...`);
            await User.deleteMany({ _id: { $in: mockUserIds } });
            await Attendance.deleteMany({ employeeId: { $in: mockUserIds } });
            await Leave.deleteMany({ employeeId: { $in: mockUserIds } });
            await Performance.deleteMany({ employeeId: { $in: mockUserIds } });
            console.log("[Database Cleanup] Purge complete.");
        }
    } catch (error) {
        console.log("error connecting to database:", error);
    }
}

export default connectDB;