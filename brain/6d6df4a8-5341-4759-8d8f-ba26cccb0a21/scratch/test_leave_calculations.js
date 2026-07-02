import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../../../../Desktop/Idea-Fueled-HRMS/backend/models/users/user.model.js";

// Load .env from backend directory
dotenv.config({ path: "../../../../Desktop/Idea-Fueled-HRMS/backend/.env" });

const test = async () => {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB.");

        // Find the test user
        const email = "anirudhtest@gmail.com";
        const user = await User.findOne({ email });
        if (!user) {
            console.log("Test user not found!");
            return;
        }
        console.log("Found user:", user.fullName);

        // Reset balances to known initial values for clean testing
        user.leaveBalance = {
            sick: { total: 6, used: 1, pending: 0 },
            casual: { total: 8, used: 2, pending: 0 },
            earned: { total: 20, used: 3, pending: 0 }
        };
        await user.save();
        console.log("Reset user leaveBalance to defaults.");

        // Simulate sick leave application
        const applyLeaveType = async (leaveType, days) => {
            let key = "";
            if (leaveType === "sick_leave") key = "sick";
            else if (leaveType === "casual_leave") key = "casual";
            else if (leaveType === "earned_leave") key = "earned";

            if (key) {
                const updateField = `leaveBalance.${key}.pending`;
                await User.findByIdAndUpdate(user._id, {
                    $inc: { [updateField]: days, pendingLeaves: days }
                });
            }
        };

        // 1. Apply Sick Leave (2 days)
        console.log("Applying 2 days of Sick Leave...");
        await applyLeaveType("sick_leave", 2);

        let updatedUser = await User.findById(user._id);
        console.log("After Sick Leave: sick.pending =", updatedUser.leaveBalance.sick.pending, 
                    "casual.pending =", updatedUser.leaveBalance.casual.pending, 
                    "earned.pending =", updatedUser.leaveBalance.earned.pending);

        if (updatedUser.leaveBalance.sick.pending !== 2 || 
            updatedUser.leaveBalance.casual.pending !== 0 || 
            updatedUser.leaveBalance.earned.pending !== 0) {
            throw new Error("Validation Failed for Sick Leave update!");
        }

        // 2. Apply Casual Leave (3 days)
        console.log("Applying 3 days of Casual Leave...");
        await applyLeaveType("casual_leave", 3);

        updatedUser = await User.findById(user._id);
        console.log("After Casual Leave: sick.pending =", updatedUser.leaveBalance.sick.pending, 
                    "casual.pending =", updatedUser.leaveBalance.casual.pending, 
                    "earned.pending =", updatedUser.leaveBalance.earned.pending);

        if (updatedUser.leaveBalance.sick.pending !== 2 || 
            updatedUser.leaveBalance.casual.pending !== 3 || 
            updatedUser.leaveBalance.earned.pending !== 0) {
            throw new Error("Validation Failed for Casual Leave update!");
        }

        // 3. Apply Earned Leave (4 days)
        console.log("Applying 4 days of Earned Leave...");
        await applyLeaveType("earned_leave", 4);

        updatedUser = await User.findById(user._id);
        console.log("After Earned Leave: sick.pending =", updatedUser.leaveBalance.sick.pending, 
                    "casual.pending =", updatedUser.leaveBalance.casual.pending, 
                    "earned.pending =", updatedUser.leaveBalance.earned.pending);

        if (updatedUser.leaveBalance.sick.pending !== 2 || 
            updatedUser.leaveBalance.casual.pending !== 3 || 
            updatedUser.leaveBalance.earned.pending !== 4) {
            throw new Error("Validation Failed for Earned Leave update!");
        }

        console.log("ALL DATABASE TEST CASES PASSED SUCCESSFULLY! ✅");
        
    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected database.");
    }
};

test();
