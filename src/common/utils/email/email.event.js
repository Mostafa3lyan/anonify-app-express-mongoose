import { EventEmitter } from "node:events";
import { sendEmail } from "./send.email.js";
import { emailTemplate } from "./templete.email.js";

export const emailEmitter = new EventEmitter();

emailEmitter.on(
  "sendConfirmEmail",
  async ({
    to,
    title = "email address",
    subject = "verify your email",
    code,
  } = {}) => {
    try {
      await sendEmail({
        to,
        subject,
        html: emailTemplate(code, to, title, subject),
      });
    } catch (error) {
      console.log(`failed to send email ${error}`);
    }
  },
);