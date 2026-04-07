import { resolve4 } from "node:dns/promises";
import net from "node:net";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const email_user = process.env.EMAIL_USER;
const email_pass = process.env.EMAIL_PASS;



const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: email_user,
    pass: email_pass,
  },
  tls: {
    rejectUnauthorized: false
  }
});


function buildConfirmEmailMessage(recipientEmail, confirmLink) {
  const html = `
    <html>
      <body>
        <p>Hi,</p>
        <p>Please confirm your email to complete sign up.</p>
        <p><a href="${confirmLink}">Confirm Email</a></p>
        <p>If you never registered on OSA pls contact us.</p>
        <p>Thank you!</p>
      </body>
    </html>
  `;

  return {
    to: recipientEmail,
    subject: "Confirm your email",
    text: `Please confirm your email: ${confirmLink}`,
    html,
  };
}


export async function sendConfirmEmail(recipientEmail, confirmLink) {
  const message = buildConfirmEmailMessage(recipientEmail, confirmLink);

  try {
    await transporter.sendMail({
      from: "OSA",
      to: recipientEmail,
      subject: `Confirm Email for verification`,
      html: message.html,
    });
  } catch (error) {
    console.log(error)
  }

}
