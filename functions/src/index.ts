import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { Resend } from 'resend';

admin.initializeApp();
const db = admin.firestore();

// Use Firebase Functions runtime config (works on Spark plan)
// Set via CLI: 
//   firebase functions:config:set resend.apikey="<KEY>" notify.admin_emails="info@fizzyjuice.uk" notify.from_email="no-reply@fizzyjuice.uk" notify.from_name="Fizzy Juice"
const cfg = functions.config() as any;

function getAdminRecipients(): string[] {
  const raw = (cfg?.notify?.admin_emails as string) || '';
  return raw.split(',').map((s: string) => s.trim()).filter(Boolean);
}

function getFrom(): string {
  const name = (cfg?.notify?.from_name as string) || 'Fizzy Juice';
  const email = (cfg?.notify?.from_email as string) || 'no-reply@fizzyjuice.uk';
  return `${name} <${email}>`;
}

async function sendEmail(subject: string, html: string) {
  const recipients = getAdminRecipients();
  if (!recipients.length) {
    console.warn('ADMIN_EMAILS not configured; skipping email send');
    return;
  }
  const apiKey = (cfg?.resend?.apikey as string) || '';
  if (!apiKey) {
    console.error('RESEND_API_KEY is not available in env');
    return;
  }
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: getFrom(),
    to: recipients,
    subject,
    html,
  });
}

export const onUserCreate = functions.auth.user().onCreate(async (user: functions.auth.UserRecord) => {
  try {
    let role: string | undefined;
    try {
      const profileSnap = await db.doc(`users/${user.uid}/prefs/profile`).get();
      role = (profileSnap.exists ? (profileSnap.data() as any)?.role : undefined) || undefined;
    } catch (e) {
      console.warn('Failed to read user profile role:', e);
    }

    const createdAt = new Date().toISOString();
    const subject = `New account: ${user.email || user.uid}`;
    const html = `
      <div>
        <h2>New account created</h2>
        <p><strong>Email:</strong> ${user.email ?? '(none)'} </p>
        <p><strong>Display Name:</strong> ${user.displayName ?? '(none)'} </p>
        <p><strong>Role:</strong> ${role ?? '(unknown)'} </p>
        <p><strong>UID:</strong> ${user.uid}</p>
        <p><strong>Created At:</strong> ${createdAt}</p>
      </div>
    `;
    await sendEmail(subject, html);
  } catch (err) {
    console.error('onUserCreate error', err);
  }
});

export const onJobDraftCreate = functions.firestore
  .document('jobs/{jobId}')
  .onCreate(async (snap: functions.firestore.QueryDocumentSnapshot, context: functions.EventContext) => {
    try {
      const data = snap.data() as any;
      if (!data) return;
      if (data.draft !== true) {
        // Only email for employer draft jobs as requested
        return;
      }
      const title = data.title || '(no title)';
      const company = data.company || '(no company)';
      const location = data.location || '(no location)';
      const ref = data.ref || context.params.jobId;
      const createdBy = data.createdBy || '(unknown)';
      const email = data.contactEmail || '(none)';

      const subject = `New draft job: ${title} @ ${company}`;
      const html = `
        <div>
          <h2>New draft job created</h2>
          <p><strong>Title:</strong> ${title}</p>
          <p><strong>Company:</strong> ${company}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>Ref:</strong> ${ref}</p>
          <p><strong>Created By UID:</strong> ${createdBy}</p>
          <p><strong>Contact Email:</strong> ${email}</p>
          <p><strong>Draft:</strong> ${String(!!data.draft)}</p>
        </div>
      `;
      await sendEmail(subject, html);
    } catch (err) {
      console.error('onJobDraftCreate error', err);
    }
  });
