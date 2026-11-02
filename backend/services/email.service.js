import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_LOGO_PATH = path.resolve(__dirname, "../assets/IF-black.png");
const REMOTE_LOGO_URL = "https://hrms.ideafueled.com/assets/IF-black-Bsefr2U2.png";

const getLogoConfig = () => {
    if (fs.existsSync(LOCAL_LOGO_PATH)) {
        return {
            src: "cid:ideafueled_logo",
            attachments: [
                {
                    filename: "IF-logo.png",
                    path: LOCAL_LOGO_PATH,
                    cid: "ideafueled_logo",
                },
            ],
        };
    }
    return {
        src: REMOTE_LOGO_URL,
        attachments: [],
    };
};

let transporter = null;

const getTransporter = () => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (!transporter && SMTP_HOST && SMTP_USER && SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT) || 587,
            secure: Number(SMTP_PORT) === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });
    }
    return transporter;
};

// Initialize initially
getTransporter();

/**
 * Dispatches an email via SMTP
 */
export const dispatchExternalEmail = async ({ to, cc, bcc, subject, body, attachments }) => {
    const mailTransporter = getTransporter();
    if (!mailTransporter) {
        return { delivered: false, reason: "SMTP not configured. Internal delivery only." };
    }

    try {
        const fromAddress = process.env.SMTP_FROM || `"Idea-Fueled HRMS" <${process.env.SMTP_USER || "rishabhloomba860@gmail.com"}>`;
        const mailOptions = {
            from: fromAddress,
            to: Array.isArray(to) ? to.join(", ") : to,
            cc: Array.isArray(cc) ? cc.join(", ") : cc,
            bcc: Array.isArray(bcc) ? bcc.join(", ") : bcc,
            subject,
            html: body,
            attachments: attachments?.map((att) => {
                if (att.content !== undefined) {
                    return {
                        filename: att.filename || att.name,
                        content: att.content,
                        contentType: att.type || "text/csv",
                        cid: att.cid,
                    };
                }
                return {
                    filename: att.name || att.filename,
                    path: att.url || att.path,
                    cid: att.cid,
                };
            }),
        };

        const info = await mailTransporter.sendMail(mailOptions);
        return { delivered: true, messageId: info.messageId };
    } catch (error) {
        console.warn("[Nodemailer] External delivery failed:", error.message);
        return { delivered: false, error: error.message };
    }
};

/**
 * Sends a Password Reset Link to the user
 */
export const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
    const subject = "Password Reset Request - Idea Fueled HRMS";
    const logoConfig = getLogoConfig();

    const body = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" max-width="580" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); border: 1px solid #E2E8F0;">
                        <!-- Logo Header -->
                        <tr>
                            <td align="center" style="padding: 36px 32px 20px; text-align: center; background-color: #FFFFFF; border-bottom: 1px solid #F1F5F9;">
                                <img src="${logoConfig.src}" alt="Idea Fueled" style="height: 44px; max-height: 48px; width: auto; max-width: 220px; display: block; margin: 0 auto; border: 0;" />
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 32px 32px;">
                                <h2 style="margin: 0 0 16px; font-size: 19px; font-weight: 600; color: #0F172A;">Hi ${name || "there"},</h2>
                                <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #475569;">
                                    We received a request to reset the password for your Idea Fueled HRMS account. Click the button below to set a new password:
                                </p>
                                <div style="text-align: center; margin: 32px 0;">
                                    <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #2D79C7; color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(45, 121, 199, 0.35); text-align: center;">
                                        Reset Password
                                    </a>
                                </div>
                                <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.5; color: #64748B;">
                                    If the button above does not work, copy and paste this link into your web browser:
                                </p>
                                <p style="margin: 0 0 24px; font-size: 12px; line-height: 1.4; color: #2D79C7; word-break: break-all;">
                                    <a href="${resetUrl}" style="color: #2D79C7; text-decoration: underline;">${resetUrl}</a>
                                </p>
                                <div style="background-color: #F1F5F9; border-left: 4px solid #2D79C7; padding: 12px 16px; border-radius: 6px; margin: 24px 0 0;">
                                    <p style="margin: 0; font-size: 12.5px; color: #475569; line-height: 1.5;">
                                        <strong>Note:</strong> This link is valid for <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your account remains secure.
                                    </p>
                                </div>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 32px; text-align: center;">
                                <p style="margin: 0; font-size: 12px; color: #94A3B8;">
                                    &copy; ${new Date().getFullYear()} Idea Fueled. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    return dispatchExternalEmail({ to, subject, body, attachments: logoConfig.attachments });
};

/**
 * Sends a Welcome Email with a Password Setup Link when a Global Admin/HR creates a new user
 */
export const sendAccountWelcomeEmail = async ({ to, name, employeeId, email, role, department, resetUrl }) => {
    const subject = "Welcome to Idea Fueled HRMS - Set Your Password";
    const logoConfig = getLogoConfig();

    const body = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Idea Fueled HRMS</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" max-width="580" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); border: 1px solid #E2E8F0;">
                        <!-- Logo Header -->
                        <tr>
                            <td align="center" style="padding: 36px 32px 20px; text-align: center; background-color: #FFFFFF; border-bottom: 1px solid #F1F5F9;">
                                <img src="${logoConfig.src}" alt="Idea Fueled" style="height: 44px; max-height: 48px; width: auto; max-width: 220px; display: block; margin: 0 auto; border: 0;" />
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 32px 32px;">
                                <h2 style="margin: 0 0 16px; font-size: 19px; font-weight: 600; color: #0F172A;">Hello ${name || "Colleague"},</h2>
                                <p style="margin: 0 0 20px; font-size: 14.5px; line-height: 1.6; color: #475569;">
                                    Your account on the <strong>Idea Fueled HRMS Portal</strong> has been created by the Administrator. Below are your official account details:
                                </p>
                                
                                <!-- Info Box -->
                                <table width="100%" cellpadding="10" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 28px;">
                                    <tr>
                                        <td style="color: #64748B; font-size: 13px; font-weight: 600; width: 40%;">Employee ID:</td>
                                        <td style="color: #0F172A; font-size: 13.5px; font-weight: 700;">${employeeId}</td>
                                    </tr>
                                    <tr style="border-top: 1px solid #E2E8F0;">
                                        <td style="color: #64748B; font-size: 13px; font-weight: 600;">Work Email:</td>
                                        <td style="color: #0F172A; font-size: 13.5px; font-weight: 600;">${email}</td>
                                    </tr>
                                    <tr style="border-top: 1px solid #E2E8F0;">
                                        <td style="color: #64748B; font-size: 13px; font-weight: 600;">Department:</td>
                                        <td style="color: #0F172A; font-size: 13.5px;">${department || "N/A"}</td>
                                    </tr>
                                    <tr style="border-top: 1px solid #E2E8F0;">
                                        <td style="color: #64748B; font-size: 13px; font-weight: 600;">Role:</td>
                                        <td style="color: #0F172A; font-size: 13.5px; text-transform: capitalize;">${role || "Employee"}</td>
                                    </tr>
                                </table>

                                <p style="margin: 0 0 16px; font-size: 14.5px; line-height: 1.6; color: #475569;">
                                    To access your portal, view attendance, submit leave requests, and manage finances, please set your personal password by clicking the button below:
                                </p>

                                <div style="text-align: center; margin: 32px 0;">
                                    <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #2D79C7; color: #FFFFFF; text-decoration: none; font-size: 14.5px; font-weight: 600; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 14px rgba(45, 121, 199, 0.4); text-align: center;">
                                        Set Your Password &amp; Get Started
                                    </a>
                                </div>

                                <p style="margin: 0 0 10px; font-size: 13px; line-height: 1.5; color: #64748B;">
                                    Alternatively, you can copy-paste the following URL directly into your browser:
                                </p>
                                <p style="margin: 0 0 24px; font-size: 12px; line-height: 1.4; color: #2D79C7; word-break: break-all;">
                                    <a href="${resetUrl}" style="color: #2D79C7; text-decoration: underline;">${resetUrl}</a>
                                </p>

                                <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 6px;">
                                    <p style="margin: 0; font-size: 12.5px; color: #92400E; line-height: 1.5;">
                                        <strong>Important:</strong> This password setup link is valid for <strong>48 hours</strong>. Please set your password promptly.
                                    </p>
                                </div>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 32px; text-align: center;">
                                <p style="margin: 0 0 6px; font-size: 12.5px; color: #64748B; font-weight: 500;">
                                    Idea Fueled HR Management System
                                </p>
                                <p style="margin: 0; font-size: 11.5px; color: #94A3B8;">
                                    If you have any questions, reach out to your HR administrator.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    return dispatchExternalEmail({ to, subject, body, attachments: logoConfig.attachments });
};

