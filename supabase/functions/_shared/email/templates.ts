export interface CallContext {
  callId: string;
  phoneNumber?: string;
  callStatus: string;
  endedReason: string;
  callSummary?: string;
}

export interface ProfileContext {
  name?: string | null;
  whatsapp?: string | null;
  phone_number: string;
  idea_description?: string | null;
  stage?: string | null;
  seeking_skills?: string[] | null;
  location_preference?: string | null;
  seriousness_score?: number | null;
}

export type EmailTemplateName = "call_failed" | "call_success";

interface EmailTemplate {
  subject: string;
  html: string;
}

// ---------------------------------------------------------------------------
// Template functions
// ---------------------------------------------------------------------------

function callFailed(call: CallContext, failureType: string): EmailTemplate {
  const summaryBlock = call.callSummary
    ? `<h2>Call Summary:</h2><p>${call.callSummary}</p>`
    : "";

  return {
    subject: `⚠️ Vapi Call Failed — ${call.endedReason}`,
    html: `
      <h1>Vapi Call Failed</h1>
      <p>${
        failureType === "empty_structured_data"
          ? "A call ended with empty interview data — the caller may have hung up before completing the interview."
          : "A call ended without collecting any interview data."
      }</p>

      <h2>Call Details:</h2>
      <ul>
        <li><strong>Phone Number:</strong> ${call.phoneNumber || "Unknown"}</li>
        <li><strong>Call ID:</strong> ${call.callId}</li>
        <li><strong>Call Status:</strong> ${call.callStatus}</li>
        <li><strong>Ended Reason:</strong> ${call.endedReason}</li>
        <li><strong>Failure Type:</strong> ${
          failureType === "empty_structured_data"
            ? "Structured data received but all fields empty"
            : "No structured data received"
        }</li>
        <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
      </ul>

      ${summaryBlock}

      <p><a href="https://founderkit.tools/admin">View Admin Dashboard</a></p>

      <hr>
      <p style="color: #666; font-size: 12px;">Call ID: ${call.callId}</p>
    `,
  };
}

function callSuccess(
  call: CallContext,
  profile: ProfileContext
): EmailTemplate {
  const founderLabel = profile.name || profile.phone_number || "Unknown";

  return {
    subject: `✅ New Founder Interview — ${founderLabel}`,
    html: `
      <h1>New Founder Profile Submitted</h1>
      <p>A new founder has completed their interview via Vapi!</p>

      <h2>Quick Summary:</h2>
      <ul>
        <li><strong>Name:</strong> ${profile.name || "N/A"}</li>
        <li><strong>WhatsApp:</strong> ${profile.whatsapp || "N/A"}</li>
        <li><strong>Phone:</strong> ${profile.phone_number || "N/A"}</li>
        <li><strong>Idea:</strong> ${profile.idea_description || "N/A"}</li>
        <li><strong>Stage:</strong> ${profile.stage || "N/A"}</li>
        <li><strong>Seeking:</strong> ${profile.seeking_skills?.join(", ") || "N/A"}</li>
        <li><strong>Location Preference:</strong> ${profile.location_preference || "N/A"}</li>
        <li><strong>Seriousness Score:</strong> ${profile.seriousness_score || "N/A"}/10</li>
      </ul>

      <h2>Call Metadata:</h2>
      <ul>
        <li><strong>Call Status:</strong> ${call.callStatus}</li>
        <li><strong>Ended Reason:</strong> ${call.endedReason}</li>
      </ul>

      <p><a href="https://founderkit.tools/admin">View Full Profile in Admin Dashboard</a></p>

      <hr>
      <p style="color: #666; font-size: 12px;">Call ID: ${call.callId}</p>
    `,
  };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export interface EmailTemplateContext {
  call: CallContext;
  failureType?: string;
  profile?: ProfileContext;
}

export function generateEmail(
  template: EmailTemplateName,
  ctx: EmailTemplateContext
): EmailTemplate {
  switch (template) {
    case "call_failed":
      return callFailed(ctx.call, ctx.failureType || "no_structured_data");
    case "call_success":
      if (!ctx.profile) {
        throw new Error("call_success template requires a profile context");
      }
      return callSuccess(ctx.call, ctx.profile);
    default:
      throw new Error(`Unknown email template: ${template}`);
  }
}
