import "dotenv/config";
import connectDB from "./config/db.js";
import User from "./models/users/user.model.js";

const migrateAdminRole = async () => {
    try {
        await connectDB();
        console.log("Connected to DB. Starting migration...");

        // Update all users with role 'admin' to 'global_admin'
        const result = await User.updateMany(
            { role: "admin" },
            { $set: { role: "global_admin" } }
        );

        console.log(`Migration Complete: Modified ${result.modifiedCount} user(s) from 'admin' to 'global_admin'.`);
        process.exit(0);
    } catch (error) {
        console.error("Migration Error:", error);
        process.exit(1);
    }
};

migrateAdminRole();
