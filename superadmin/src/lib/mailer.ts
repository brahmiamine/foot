import nodemailer from "nodemailer";

/**
 * Repris du pattern déjà utilisé dans sso/sellerPortal (src/lib/mailer.ts) :
 * dégrade proprement (log + pas d'erreur) si SMTP n'est pas configuré,
 * plutôt que de faire planter le flux appelant (ex. invitation staff) en
 * environnement de dev sans SMTP.
 */
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
    console.warn("⚠️ SMTP_USER/SMTP_PASS absents — email non envoyé (mode dev).", { to, subject });
    return;
  }

  try {
    return await transporter.sendMail({
      from: process.env.SMTP_FROM || "no-reply@foot-platform.tn",
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html,
    });
  } catch (error) {
    console.error("❌ Échec envoi email:", error);
  }
}
