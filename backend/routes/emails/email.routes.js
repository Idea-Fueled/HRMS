import express from "express";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";
import { uploadDoc } from "../../middlewares/upload.middleware.js";
import {
    getEmails,
    getEmailById,
    sendEmail,
    saveDraft,
    updateEmailStatus,
    deleteEmail,
    batchAction,
    getUnreadCount,
    getCompanyContacts,
    triggerDsrReminderManual,
} from "../../controllers/emails/email.controller.js";

const router = express.Router();

router.use(isAuthenticated);

router.get("/", getEmails);
router.get("/unread-count", getUnreadCount);
router.get("/contacts", getCompanyContacts);

router.post("/trigger-dsr", triggerDsrReminderManual);
router.get("/:id", getEmailById);

router.post("/send", uploadDoc.array("attachments", 5), sendEmail);
router.post("/draft", saveDraft);
router.post("/batch", batchAction);

router.patch("/:id/status", updateEmailStatus);
router.delete("/:id", deleteEmail);

export default router;
