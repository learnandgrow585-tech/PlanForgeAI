import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Sends transactional email through SMTP (Mailhog locally on :1025).
 * If the SMTP server is unreachable, it logs the email to the console instead,
 * so development never breaks when Mailhog isn't running.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger('Email');
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.from = this.config.get<string>('SMTP_FROM', 'PlanForge AI <no-reply@planforge.ai>');
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'localhost'),
      port: Number(this.config.get<string>('SMTP_PORT', '1025')),
      secure: false,
      // Mailhog needs no auth; only set if provided
      auth: this.config.get<string>('SMTP_USER')
        ? {
            user: this.config.get<string>('SMTP_USER'),
            pass: this.config.get<string>('SMTP_PASS'),
          }
        : undefined,
    });
  }

  private async send(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Sent "${subject}" to ${to}`);
    } catch (err) {
      // Mailhog not running — log instead of failing the request
      this.logger.warn(`SMTP unavailable, logging email instead → To: ${to} | Subject: ${subject}`);
    }
  }

  async sendWelcome(to: string, name?: string) {
    await this.send(
      to,
      'Welcome to PlanForge AI 🎯',
      `<div style="font-family:sans-serif">
        <h2>Welcome${name ? `, ${name}` : ''}!</h2>
        <p>Your PlanForge AI account is ready. Pick a planner and generate your first
        AI-powered 12-section plan in seconds.</p>
        <p><a href="http://localhost:3000/planners">Browse planners →</a></p>
      </div>`,
    );
  }

  async sendPlanReady(to: string, planTitle: string, planId: string) {
    await this.send(
      to,
      `Your plan is ready: ${planTitle}`,
      `<div style="font-family:sans-serif">
        <h2>Your plan is ready 🎉</h2>
        <p><strong>${planTitle}</strong> has been generated with a full action plan,
        milestones and a success score.</p>
        <p><a href="http://localhost:3000/plans/${planId}">View your plan →</a></p>
      </div>`,
    );
  }

  async sendMilestoneDigest(to: string, count: number) {
    await this.send(
      to,
      `You have ${count} milestone${count === 1 ? '' : 's'} coming up`,
      `<div style="font-family:sans-serif">
        <h2>Upcoming milestones</h2>
        <p>You have <strong>${count}</strong> milestone${count === 1 ? '' : 's'} due in the next 7 days.
        Keep your streak going!</p>
        <p><a href="http://localhost:3000/dashboard">Open dashboard →</a></p>
      </div>`,
    );
  }
}
