import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465,
  auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPassword } : undefined,
});

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  // In development without SMTP configured, just log instead of failing the request.
  if (!env.smtpHost) {
    console.log(`[email:dev] to=${to} subject="${subject}"`);
    return;
  }
  await transporter.sendMail({ from: env.emailFrom, to, subject, html });
}

// --- Templated notifications used across the appointment lifecycle ---

export const emailTemplates = {
  appointmentBooked: (clientName: string, propertyTitle: string, date: string) => ({
    subject: "Your property viewing request has been received",
    html: `<p>Hi ${clientName},</p>
      <p>Your viewing request for <strong>${propertyTitle}</strong> on <strong>${date}</strong> has been received and is pending confirmation from the agent.</p>`,
  }),
  appointmentConfirmed: (clientName: string, propertyTitle: string, date: string) => ({
    subject: "Your appointment is confirmed",
    html: `<p>Hi ${clientName},</p>
      <p>Great news! Your appointment for <strong>${propertyTitle}</strong> on <strong>${date}</strong> has been confirmed.</p>`,
  }),
  appointmentCancelled: (clientName: string, propertyTitle: string, date: string) => ({
    subject: "Your appointment has been cancelled",
    html: `<p>Hi ${clientName},</p>
      <p>Your appointment for <strong>${propertyTitle}</strong> on <strong>${date}</strong> has been cancelled.</p>`,
  }),
  appointmentRescheduleRequested: (clientName: string, propertyTitle: string, newDate: string) => ({
    subject: "Reschedule request received",
    html: `<p>Hi ${clientName},</p>
      <p>We received your request to reschedule your appointment for <strong>${propertyTitle}</strong> to <strong>${newDate}</strong>. It is now pending agent approval.</p>`,
  }),
  paymentReceived: (clientName: string, propertyTitle: string, amount: string) => ({
    subject: "Payment received",
    html: `<p>Hi ${clientName},</p>
      <p>We've received your payment of <strong>${amount}</strong> for <strong>${propertyTitle}</strong>. Thank you!</p>`,
  }),
  clientPortalWelcome: (clientName: string, link: string) => ({
    subject: "Access your EstateCall client portal",
    html: `<p>Hi ${clientName},</p>
      <p>You can view and manage your appointments anytime here: <a href="${link}">${link}</a></p>`,
  }),
  agentNewAppointment: (propertyTitle: string, clientName: string, date: string) => ({
    subject: `New appointment request - ${propertyTitle}`,
    html: `<p>You have a new appointment request from <strong>${clientName}</strong> for <strong>${propertyTitle}</strong> on <strong>${date}</strong>.</p>`,
  }),
  agentAppointmentCancelled: (propertyTitle: string, clientName: string) => ({
    subject: `Appointment cancelled - ${propertyTitle}`,
    html: `<p><strong>${clientName}</strong> cancelled their appointment for <strong>${propertyTitle}</strong>.</p>`,
  }),
};
