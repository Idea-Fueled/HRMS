import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("connected to database!")
    } catch (error) {
        console.log("error connecting to database")
    }
}

export default connectDB;