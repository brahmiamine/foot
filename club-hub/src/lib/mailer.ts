import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("⚠️ SMTP matching credentials (SMTP_USER/SMTP_PASS) missing in .env — skip sending email.");
    return;
  }

  try {
    return await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html,
    });
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    // Ne pas bloquer le reste de l'exécution pour une erreur d'email
  }
}
