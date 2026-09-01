export function outlookConfigured() {
  return Boolean(
    process.env.MS_TENANT_ID &&
      process.env.MS_CLIENT_ID &&
      process.env.MS_CLIENT_SECRET &&
      process.env.MS_MAILBOX
  );
}

async function graphToken() {
  const body = new URLSearchParams({
    client_id: process.env.MS_CLIENT_ID || "",
    client_secret: process.env.MS_CLIENT_SECRET || "",
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`,
    { method: "POST", body }
  );
  if (!res.ok) {
    throw new Error(`Outlook sign-in failed (${res.status}). Ask county IT to check the Azure app.`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export async function sendOutlookMail(input: {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  attachments?: Array<{ name: string; contentType: string; contentBytes: string }>;
}) {
  if (!outlookConfigured()) {
    return { sent: false as const, reason: "Outlook is not connected yet. The message was saved as a draft." };
  }

  const token = await graphToken();
  const toRecipients = input.to.split(",").map((address) => ({
    emailAddress: { address: address.trim() },
  }));
  const ccRecipients = input.cc
    ? input.cc.split(",").map((address) => ({ emailAddress: { address: address.trim() } }))
    : [];

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${process.env.MS_MAILBOX}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: input.subject,
          body: { contentType: "Text", content: input.body },
          toRecipients,
          ccRecipients,
          attachments: input.attachments?.map((a) => ({
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: a.name,
            contentType: a.contentType,
            contentBytes: a.contentBytes,
          })),
        },
        saveToSentItems: true,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Outlook could not send the message: ${text.slice(0, 240)}`);
  }
  return { sent: true as const };
}
