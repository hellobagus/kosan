import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false, error: "SMTP belum dikonfigurasi. Atur SMTP_HOST, SMTP_USER, SMTP_PASS di .env" };
  }

  const fromName = process.env.SMTP_FROM?.trim();
  const fromUser = process.env.SMTP_USER;
  const from =
    fromName && fromName.includes("@")
      ? fromName
      : fromUser
        ? `${fromName || "Kosanku"} <${fromUser}>`
        : fromName || "Kosanku";

  try {
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });
    return { ok: true };
  } catch (err) {
    console.error("Email send error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Gagal mengirim email" };
  }
}
