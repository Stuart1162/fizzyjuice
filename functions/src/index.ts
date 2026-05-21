import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { Resend } from 'resend';

admin.initializeApp();
const db = admin.firestore();

// Use Firebase Functions runtime config (works on Spark plan)
// Set via CLI: 
//   firebase functions:config:set resend.apikey="<KEY>" notify.admin_emails="info@fizzyjuice.uk" notify.from_email="no-reply@fizzyjuice.uk" notify.from_name="Fizzy Juice"
const cfg = functions.config() as any;

const superAdminEnv = [
  (cfg?.app?.superadmins as string) || '',
  process.env.SUPERADMIN_EMAILS || '',
  process.env.REACT_APP_SUPERADMIN_EMAIL || '',
]
  .filter(Boolean)
  .join(',');

const SUPERADMIN_EMAILS = new Set(
  superAdminEnv
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return SUPERADMIN_EMAILS.has(email.toLowerCase());
}

async function loadUserRole(uid: string): Promise<string | null> {
  try {
    const snap = await db.doc(`users/${uid}/prefs/profile`).get();
    if (!snap.exists) return null;
    const data = snap.data() as any;
    return typeof data?.role === 'string' ? data.role : null;
  } catch (err) {
    console.warn('Failed to load user role for', uid, err);
    return null;
  }
}

async function isAdminUser(uid: string, email?: string | null): Promise<boolean> {
  if (isSuperAdminEmail(email)) return true;
  const role = await loadUserRole(uid);
  return role === 'admin';
}

function normalizeAppliedAt(value: any): number | null {
  if (!value) return null;
  if (typeof value?.toMillis === 'function') {
    try {
      return value.toMillis();
    } catch {
      return null;
    }
  }
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

async function ensureJobAccess(
  jobId: string,
  uid: string,
  isAdmin: boolean
): Promise<{ data: FirebaseFirestore.DocumentData; ownerUid: string | null }> {
  const jobSnap = await db.doc(`jobs/${jobId}`).get();
  if (!jobSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Job not found');
  }
  const data = jobSnap.data() || {};
  const ownerUid = (data.createdBy || data.ownerUid || data.employerId || null) as string | null;
  if (!isAdmin && ownerUid !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'You do not have access to this job');
  }
  return { data, ownerUid };
}

async function filterAccessibleJobIds(jobIds: string[], uid: string, isAdmin: boolean): Promise<string[]> {
  if (jobIds.length === 0) return [];
  const unique = Array.from(new Set(jobIds));
  const refs = unique.map((jobId) => db.doc(`jobs/${jobId}`));
  const snaps = await db.getAll(...refs);
  const allowed: string[] = [];
  snaps.forEach((snap, idx) => {
    if (!snap.exists) return;
    const data = snap.data() || {};
    const ownerUid = (data.createdBy || data.ownerUid || data.employerId || null) as string | null;
    if (isAdmin || ownerUid === uid) {
      allowed.push(unique[idx]);
    }
  });
  return allowed;
}

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

export const listJobApplications = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }
  const jobId = typeof data?.jobId === 'string' ? data.jobId.trim() : '';
  if (!jobId) {
    throw new functions.https.HttpsError('invalid-argument', 'jobId is required');
  }
  const email = (context.auth.token?.email as string | undefined) || null;
  const isAdmin = await isAdminUser(context.auth.uid, email);
  await ensureJobAccess(jobId, context.auth.uid, isAdmin);

  const appsSnap = await db.collection('applications').where('jobId', '==', jobId).get();
  const applications = appsSnap.docs.map((docSnap) => {
    const appData = docSnap.data() as any;
    return {
      id: docSnap.id,
      jobId: appData.jobId || null,
      jobTitle: appData.jobTitle || null,
      employerId: appData.employerId || null,
      employerEmail: appData.employerEmail || null,
      applicantId: appData.applicantId || null,
      applicantName: appData.applicantName || null,
      applicantEmail: appData.applicantEmail || null,
      coverLetter: appData.coverLetter || null,
      cvUrl: appData.cvUrl || null,
      profileSummary: appData.profileSummary || null,
      appliedAt: normalizeAppliedAt(appData.appliedAt),
      status: appData.status || 'new',
    };
  });

  return { applications };
});

export const getJobInsights = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }
  const rawIds = Array.isArray(data?.jobIds) ? data.jobIds : [];
  const jobIds = rawIds.filter((id: any) => typeof id === 'string' && id.trim().length > 0) as string[];
  if (jobIds.length === 0) {
    return { applicationCounts: {}, jobMetrics: {} };
  }
  const email = (context.auth.token?.email as string | undefined) || null;
  const isAdmin = await isAdminUser(context.auth.uid, email);
  const allowedIds = await filterAccessibleJobIds(jobIds, context.auth.uid, isAdmin);
  if (allowedIds.length === 0) {
    throw new functions.https.HttpsError('permission-denied', 'No access to the requested jobs');
  }

  const applicationCounts: Record<string, number> = {};
  const jobMetrics: Record<string, Record<string, any>> = {};

  await Promise.all(
    allowedIds.map(async (jobId) => {
      const [appsSnap, metricsSnap] = await Promise.all([
        db.collection('applications').where('jobId', '==', jobId).get(),
        db.doc(`jobMetrics/${jobId}`).get(),
      ]);
      applicationCounts[jobId] = appsSnap.size;
      jobMetrics[jobId] = (metricsSnap.exists ? (metricsSnap.data() as any) : {}) || {};
    })
  );

  return { applicationCounts, jobMetrics };
});
