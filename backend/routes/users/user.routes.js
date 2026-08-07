import express from "express"
import { 
    getUpcomingBirthdays, 
    loginUser, 
    logoutUser, 
    registerUser, 
    getCurrentUser,
    getAwayToday,
    getPeopleEvents,
    uploadProfilePicture,
    updateProfilePicture,
    getUserFinances,
    uploadDocument
} from "../../controllers/users/user.controller.js";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";
import { upload, uploadDoc } from "../../middlewares/upload.middleware.js";

const router = express.Router();

router.post("/register", registerUser)
router.post("/login", loginUser);
router.get("/upcoming-birthdays", getUpcomingBirthdays);
router.post("/logout", logoutUser)
router.get("/me", isAuthenticated, getCurrentUser);
router.get("/me/finances", isAuthenticated, getUserFinances);
router.get("/away-today", isAuthenticated, getAwayToday);
router.get("/people-events", isAuthenticated, getPeopleEvents);
router.post("/upload-profile-picture", isAuthenticated, upload.single("image"), uploadProfilePicture);
router.put("/update-profile-picture", isAuthenticated, updateProfilePicture);
router.post("/upload-document", isAuthenticated, uploadDoc.single("file"), uploadDocument);

export default router;