import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

export type InviteEmailPayload = {
  email: string;
  name?: string | null;
  tenantName: string;
  role: string;
  inviteLink: string;
  expiresAt: Date;
};

export type WelcomeEmailPayload = {
  email: string;
  name?: string | null;
  tenantName: string;
  loginLink: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private getSmtpConfig() {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const portValue = this.config.get<string>('SMTP_PORT')?.trim();
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const password = this.config.get<string>('SMTP_PASSWORD')?.trim();
    const fromEmail = this.config.get<string>('SMTP_FROM_EMAIL')?.trim();
    const fromName = this.config.get<string>('SMTP_FROM_NAME')?.trim();

    if (!host || !portValue || !user || !password || !fromEmail || !fromName) {
      return null;
    }

    const port = Number(portValue);
    if (!Number.isFinite(port)) {
      this.logger.warn('SMTP_PORT is configured but invalid. Email delivery will be skipped.');
      return null;
    }

    return {
      host,
      port,
      user,
      password,
      fromEmail,
      fromName,
    };
  }

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const smtpConfig = this.getSmtpConfig();
    if (!smtpConfig) {
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password,
      },
    });

    return this.transporter;
  }

  private getFromAddress() {
    const smtpConfig = this.getSmtpConfig();
    if (!smtpConfig) {
      return null;
    }

    return `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`;
  }

  private formatRole(role: string) {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  }

  async sendInviteEmail(payload: InviteEmailPayload) {
    const transporter = this.getTransporter();
    const from = this.getFromAddress();

    if (!transporter || !from) {
      this.logger.warn(`Invite email skipped because SMTP is not configured for ${payload.email}.`);
      return false;
    }

    const greetingName = payload.name?.trim() || payload.email;
    const formattedRole = this.formatRole(payload.role);
    const expiresAt = payload.expiresAt.toISOString().slice(0, 10);

    await transporter.sendMail({
      from,
      to: payload.email,
      subject: `You're invited to join ${payload.tenantName}`,
      text: [
        `Hi ${greetingName},`,
        '',
        `You've been invited to join ${payload.tenantName} as a ${formattedRole}.`,
        `This invite expires on ${expiresAt}.`,
        '',
        `Accept your invite: ${payload.inviteLink}`,
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
          <p>Hi ${greetingName},</p>
          <p>You've been invited to join <strong>${payload.tenantName}</strong> as a <strong>${formattedRole}</strong>.</p>
          <p>This invite expires on <strong>${expiresAt}</strong>.</p>
          <p><a href="${payload.inviteLink}" style="display:inline-block;padding:12px 18px;border-radius:9999px;background:#3B6BFF;color:#ffffff;text-decoration:none;font-weight:600">Accept invite</a></p>
        </div>
      `,
    });

    return true;
  }

  async sendWelcomeEmail(payload: WelcomeEmailPayload) {
    const transporter = this.getTransporter();
    const from = this.getFromAddress();

    if (!transporter || !from) {
      this.logger.warn(`Welcome email skipped because SMTP is not configured for ${payload.email}.`);
      return false;
    }

    const greetingName = payload.name?.trim() || payload.email;

    await transporter.sendMail({
      from,
      to: payload.email,
      subject: `Welcome to ${payload.tenantName}`,
      text: [
        `Hi ${greetingName},`,
        '',
        `Welcome to ${payload.tenantName}. Your workspace is ready.`,
        '',
        `Sign in here: ${payload.loginLink}`,
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
          <p>Hi ${greetingName},</p>
          <p>Welcome to <strong>${payload.tenantName}</strong>. Your workspace is ready.</p>
          <p><a href="${payload.loginLink}" style="display:inline-block;padding:12px 18px;border-radius:9999px;background:#3B6BFF;color:#ffffff;text-decoration:none;font-weight:600">Go to workspace</a></p>
        </div>
      `,
    });

    return true;
  }
}
