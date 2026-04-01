import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

export async function sendConfirmEmail(recipientEmail, confirmLink) {
  if (!emailUser || !emailPass) {
    throw new Error("Email service not configured. Set EMAIL_USER and EMAIL_PASS.");
  }

  const html = `
    <html>
      <body>
        <p>Hi,</p>
        <p>Please confirm your email to complete sign up.</p>
        <p><a href="${confirmLink}">Confirm Email</a></p>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"OSA" <${emailUser}>`,
    to: recipientEmail,
    subject: "Confirm your email",
    text: `Please confirm your email: ${confirmLink}`,
    html,
  });
}
