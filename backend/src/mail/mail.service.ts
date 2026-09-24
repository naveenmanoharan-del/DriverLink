import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MailAttachment {
  filename: string;
  content: Buffer;
}

/**
 * Sends notification emails to the site owner through Resend's HTTP API.
 *
 * HTTP rather than SMTP because Render's free plan blocks outbound SMTP ports.
 * Sending is best-effort: a mail failure is logged, never thrown, so an outage
 * at the mail provider can't stop someone from registering.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  /** Sends to every address in ADMIN_NOTIFY_EMAIL (comma-separated). */
  async notifyAdmin(
    subject: string,
    html: string,
    attachments: MailAttachment[] = [],
  ) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const to = (this.config.get<string>('ADMIN_NOTIFY_EMAIL') ?? '')
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
    if (!apiKey || to.length === 0) {
      this.logger.warn(
        `Email not configured (RESEND_API_KEY / ADMIN_NOTIFY_EMAIL); skipped: ${subject}`,
      );
      return;
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:
            this.config.get<string>('MAIL_FROM') ??
            'Yukti Solutions <onboarding@resend.dev>',
          to,
          subject,
          html,
          attachments: attachments.map((a) => ({
            filename: a.filename,
            content: a.content.toString('base64'),
          })),
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        this.logger.error(
          `Email failed (${res.status}): ${await res.text()} — ${subject}`,
        );
      }
    } catch (err) {
      this.logger.error(`Email failed: ${String(err)} — ${subject}`);
    }
  }
}

/** Escapes user-supplied text before it goes into an email body. */
export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Renders label/value pairs as a simple table; empty values are dropped. */
export function detailsTable(
  rows: [string, string | number | null | undefined][],
): string {
  const body = rows
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#555">${escapeHtml(k)}</td>` +
        `<td style="padding:4px 0"><strong>${escapeHtml(v)}</strong></td></tr>`,
    )
    .join('');
  return `<table style="font-family:sans-serif;font-size:14px">${body}</table>`;
}
