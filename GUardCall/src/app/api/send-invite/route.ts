import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { emails, meetingId } = await req.json();

    // ✅ Validation
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "Emails required" }, { status: 400 });
    }

    if (!meetingId) {
      return NextResponse.json({ error: "Meeting ID missing" }, { status: 400 });
    }

    // ✅ ENV
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || req.headers.get("origin") || "http://localhost:9000").trim();

    if (!user || !pass || !baseUrl) {
      return NextResponse.json(
        { error: "Missing env variables" },
        { status: 500 }
      );
    }

    // ✅ PUBLIC LINK (VERY IMPORTANT)
    const meetingLink = `${baseUrl}/meeting/${meetingId}`;

    // ✅ MAIL TRANSPORT
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });

    // ✅ SEND MAILS
    await Promise.all(
      emails.map((email: string) =>
        transporter.sendMail({
          from: `"GuardCall Secure" <${user}>`,
          to: email,
          subject: "🔐 GuardCall Meeting Invite",
          html: `
            <div style="font-family:sans-serif;padding:20px;background:#0b0d11;color:#fff;border-radius:10px;">
              <h2 style="color:#60a5fa;">Secure Meeting Invitation</h2>
              <p>You have been invited to join a secure meeting.</p>

              <a href="${meetingLink}" 
                 style="display:inline-block;margin-top:20px;padding:12px 20px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;">
                Join Meeting
              </a>

              <p style="margin-top:20px;font-size:12px;color:#aaa;">
                ${meetingLink}
              </p>
            </div>
          `,
        })
      )
    );

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Invite Error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to send emails" },
      { status: 500 }
    );
  }
}