import { prisma } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { hashPassword, comparePassword } from "../../utils/password";
import { signToken } from "../../utils/jwt";
import { sendEmail, emailTemplates } from "../../utils/email";
import { env } from "../../config/env";

export const authService = {
  async registerAgent(data: { email: string; password: string; fullName: string; companyName?: string; phone?: string }) {
    const existing = await prisma.agent.findUnique({ where: { email: data.email } });
    if (existing) throw ApiError.conflict("An account with this email already exists");

    const agent = await prisma.agent.create({
      data: {
        email: data.email,
        password: await hashPassword(data.password),
        fullName: data.fullName,
        companyName: data.companyName,
        phone: data.phone,
      },
    });

    const token = signToken({ sub: agent.id, email: agent.email, role: agent.role }, "agent");
    return { token, agent: sanitizeAgent(agent) };
  },

  async loginAgent(email: string, password: string) {
    const agent = await prisma.agent.findUnique({ where: { email } });
    if (!agent || !(await comparePassword(password, agent.password))) {
      throw ApiError.unauthorized("Invalid email or password");
    }
    const token = signToken({ sub: agent.id, email: agent.email, role: agent.role }, "agent");
    return { token, agent: sanitizeAgent(agent) };
  },

  // Client self-registers a portal account. This only succeeds if a Client record
  // already exists for that email (i.e. they were created via an appointment booking,
  // exactly like in the product walkthrough: "create your account with the same email").
  async registerClient(email: string, password: string) {
    const client = await prisma.client.findUnique({ where: { email } });
    if (!client) {
      throw ApiError.badRequest("No appointment found for this email yet. Book a viewing first, then create your portal account.");
    }
    if (client.password) {
      throw ApiError.conflict("An account already exists for this email. Please log in.");
    }

    const updated = await prisma.client.update({
      where: { email },
      data: { password: await hashPassword(password) },
    });

    const token = signToken({ sub: updated.id, email: updated.email }, "client");
    return { token, client: sanitizeClient(updated) };
  },

  async loginClient(email: string, password: string) {
    const client = await prisma.client.findUnique({ where: { email } });
    if (!client || !client.password || !(await comparePassword(password, client.password))) {
      throw ApiError.unauthorized("Invalid email or password");
    }
    const token = signToken({ sub: client.id, email: client.email }, "client");
    return { token, client: sanitizeClient(client) };
  },

  // Called after booking to nudge the client to set up portal access, mirroring
  // the "special link" email flow described in the walkthrough.
  async sendPortalInvite(email: string, fullName: string) {
    const link = `${env.clientDashboardUrl}/portal/create-account?email=${encodeURIComponent(email)}`;
    const { subject, html } = emailTemplates.clientPortalWelcome(fullName, link);
    await sendEmail({ to: email, subject, html });
  },
};

function sanitizeAgent<T extends { password: string }>(agent: T) {
  const { password, ...rest } = agent;
  return rest;
}
function sanitizeClient<T extends { password: string | null }>(client: T) {
  const { password, ...rest } = client;
  return rest;
}
