import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../config";

export interface Poruka {
  to: string;
  subject: string;
  text: string;
}

export class Mailer {
  private transporter: Transporter | null = null;
  private readonly aktivan: boolean;

  constructor() {
    this.aktivan = !!config.smtp.host;
    if (this.aktivan) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
      });
    }
  }

  async posalji(p: Poruka): Promise<void> {
    if (!this.aktivan || !this.transporter) {
      console.log(`[notification] (log-only) -> ${p.to} | ${p.subject}\n${p.text}\n`);
      return;
    }
    await this.transporter.sendMail({ from: config.smtp.from, to: p.to, subject: p.subject, text: p.text });
    console.log(`[notification] poslata e-posta -> ${p.to} | ${p.subject}`);
  }
}