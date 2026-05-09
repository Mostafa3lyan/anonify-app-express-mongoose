import nodemailer from "nodemailer";
import { APP_NAME, EMAIL_APP_PASSWORD, Email_USER } from "../../../../config/config.service.js";

export const sendEmail = async ({
  to,
  cc,
  bcc,
  subject,
  html,
  attachments = []
}) => {
  // Create a transporter using SMTP
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: Email_USER,
      pass: EMAIL_APP_PASSWORD
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${APP_NAME}" <${Email_USER}>`, // sender address
      to,
      cc,
      bcc,
      subject,
      html,
      attachments
    });

    console.log("Message sent: %s", info.messageId);
    // Preview URL is only available when using an Ethereal test account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error("Error while sending mail:", err);
  }
};
