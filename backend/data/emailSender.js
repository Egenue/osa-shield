import { resolve4 } from "node:dns/promises";
import net from "node:net";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { text } from "node:stream/consumers";

dotenv.config();

const email_user = process.env.EMAIL_USER;
const email_pass = process.env.EMAIL_PASS;
const api_key = process.env.EMAIL_SENDER_APT_KEY;
const api_url = process.env.EMAIL_API_URL;




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

function buildResetPassordMail(email, redirectLink){
  const htmlMessage = `
  <html>
    <body>
      <p>Friend, </p>
      <p>This a reset password bypass</p>
      <p>It will expire in 60 minutes be fast</p>
      <p><a href=${redirectLink}></a>Reset</p>
      <p>If you never requested email contact us for instant account deletion lol!</p>
      <p>Thank you friend</p>
    </body>
  </html>
  `;

  return {
    to: receiverMail,
    subject: "Reset Password",
    text: `Reset your password friend ${htmlMessage}`,
    htmlMessage, 
  }
}

export async function sendConfirmEmail(recipientEmail, confirmLink) {
  const message = buildConfirmEmailMessage(recipientEmail, confirmLink);

  try {

    await fetch(api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api_key}`,
      },
      body: JSON.stringify({
        from: email_user,
        to: recipientEmail,
        subject: "OSA Confirm email no reply",
        html: message.html,
      })
    });
   
  } catch (error) {
    console.log(error)
  }

}

export async function sendResetPasswordMail(email, redirectLink) {
  buildResetPassordMail(email, redirectLink);
  try {
    await fetch(api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api_key}`,
      },
      body: JSON.stringify({
        from: email_user,
        to: email,
        subject: "OSA reset password",
        html: htmlMessage.html
      })
    });
  } catch (error) {
    console.log(error);
  }
  
}