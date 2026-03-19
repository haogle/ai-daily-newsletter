import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || "re_placeholder");
}

export async function sendNewsletter(
  htmlContent: string,
  date: string
): Promise<{ success: boolean; error?: string }> {
  const emailFrom = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const emailTo = (process.env.EMAIL_TO || "").split(",").filter(Boolean);

  if (emailTo.length === 0) {
    return { success: false, error: "No recipients configured" };
  }

  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: `AI Daily <${emailFrom}>`,
      to: emailTo,
      subject: `AI Daily Newsletter — ${date}`,
      html: htmlContent,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("Email sent successfully:", data?.id);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to send email:", message);
    return { success: false, error: message };
  }
}
