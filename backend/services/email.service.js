import nodemailer from "nodemailer";

let transporter = null;

const initTransporter = () => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT) || 587,
            secure: Number(SMTP_PORT) === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });
    } else {
        transporter = null;
    }
};

initTransporter();

/**
 * Optionally dispatches an email via SMTP if configured in .env
 */
export const dispatchExternalEmail = async ({ to, cc, bcc, subject, body, attachments }) => {
    if (!transporter) {
        // SMTP not configured, purely internal mailbox delivery
        return { delivered: false, reason: "SMTP not configured. Internal delivery only." };
    }

    try {
        const mailOptions = {
            from: process.env.SMTP_FROM || `"Idea-Fueled HRMS" <${process.env.SMTP_USER}>`,
            to: Array.isArray(to) ? to.join(", ") : to,
            cc: Array.isArray(cc) ? cc.join(", ") : cc,
            bcc: Array.isArray(bcc) ? bcc.join(", ") : bcc,
            subject,
            html: body,
            attachments: attachments?.map((att) => ({
                filename: att.name,
                path: att.url,
            })),
        };

        const info = await transporter.sendMail(mailOptions);
        return { delivered: true, messageId: info.messageId };
    } catch (error) {
        console.warn("[Nodemailer] External delivery skipped or failed:", error.message);
        return { delivered: false, error: error.message };
    }
};
