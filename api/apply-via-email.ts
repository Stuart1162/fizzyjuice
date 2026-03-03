const nodemailer = require('nodemailer');

// Reuse the same environment variables as the legacy Express server
const NODE_ENV = process.env.NODE_ENV || 'production';
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587', 10);
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;

let mailTransporter: any = null;
if (EMAIL_HOST && EMAIL_USER && EMAIL_PASS) {
  mailTransporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
} else {
  console.warn('[ApplyEmail API] EMAIL_HOST/EMAIL_USER/EMAIL_PASS not fully configured; application emails are disabled');
}

function setCors(res: any, origin?: string | string[]) {
  res.setHeader('Access-Control-Allow-Origin', typeof origin === 'string' ? origin : '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req: any, res: any) {
  setCors(res, req.headers.origin);
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body: any = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) { body = {}; }
    }

    const {
      employerEmail,
      jobTitle,
      jobId,
      applicantName,
      applicantEmail,
      coverLetter,
      profileUrl,
      cvUrl,
      profileSummary,
    } = body || {};

    // If email is not configured, simulate success in non-production so
    // the frontend flow can still be tested.
    if (!mailTransporter || !EMAIL_FROM) {
      if (NODE_ENV !== 'production') {
        console.warn('[ApplyEmail API] Mail transport not configured; simulating application email in non-production env');
        console.info('[ApplyEmail API] Application payload', {
          employerEmail,
          jobTitle,
          jobId,
          applicantName,
          applicantEmail,
          coverLetter,
          profileUrl,
          cvUrl,
          profileSummary,
        });
        return res.status(200).json({ ok: true, emailSent: false });
      }
      return res.status(500).json({ error: 'Application email not configured on server' });
    }

    if (!employerEmail || !jobTitle || !applicantEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const safeName = applicantName || 'A Fizzy Juice candidate';
    const safeCover = coverLetter || '(No cover letter provided)';

    const lines: string[] = [];
    lines.push(`${safeName} has applied for your role "${jobTitle}" on Fizzy Juice.`);
    if (jobId) {
      lines.push(`Job ID: ${jobId}`);
    }
    if (profileUrl) {
      lines.push(`Profile: ${profileUrl}`);
    }
    lines.push('');
    lines.push('Cover letter:');
    lines.push(safeCover);
    lines.push('');

    if (profileSummary && typeof profileSummary === 'object') {
      lines.push('Candidate profile details:');

      const {
        // preferredJobTitle is intentionally omitted from the email
        locationCity,
        postcode,
        availability,
        shiftPreference,
        yearsExperience,
        instagramUrl,
        linkedinUrl,
        certifications,
      } = profileSummary;

      if (locationCity) {
        lines.push(`- Location: ${String(locationCity)}`);
      }
      if (postcode) {
        lines.push(`- Postcode: ${String(postcode)}`);
      }
      if (availability && (Array.isArray(availability) ? availability.length : String(availability).trim() !== '')) {
        const val = Array.isArray(availability) ? availability.join(', ') : String(availability);
        lines.push(`- Availability: ${val}`);
      }
      if (shiftPreference && (Array.isArray(shiftPreference) ? shiftPreference.length : String(shiftPreference).trim() !== '')) {
        const val = Array.isArray(shiftPreference) ? shiftPreference.join(', ') : String(shiftPreference);
        lines.push(`- Shift Preference: ${val}`);
      }
      if (yearsExperience !== undefined && yearsExperience !== null && String(yearsExperience).trim() !== '') {
        lines.push(`- Years Experience: ${String(yearsExperience)}`);
      }
      if (instagramUrl && String(instagramUrl).trim() !== '') {
        lines.push(`- Instagram: ${String(instagramUrl)}`);
      }
      if (linkedinUrl && String(linkedinUrl).trim() !== '') {
        lines.push(`- Linkedin: ${String(linkedinUrl)}`);
      }
      if (certifications && (Array.isArray(certifications) ? certifications.length : String(certifications).trim() !== '')) {
        const val = Array.isArray(certifications) ? certifications.join(', ') : String(certifications);
        lines.push(`- Certifications: ${val}`);
      }

      lines.push('');
    }

    if (cvUrl) {
      lines.push(`Candidate CV: ${cvUrl}`);
      lines.push('');
    }
    if (profileUrl) {
      lines.push(`View candidate profile: ${profileUrl}`);
      lines.push('');
    }
    lines.push(`Reply to the candidate at: ${applicantEmail}`);

    const textBody = lines.join('\n');

    // 1) Email to employer with Fizzy Juice copied in
    await mailTransporter.sendMail({
      from: EMAIL_FROM,
      to: employerEmail,
      cc: 'info@fizzyjuice.uk',
      subject: `New application for ${jobTitle} via Fizzy Juice`,
      text: textBody,
    });

    // 2) Confirmation email to the applicant
    const applicantLines: string[] = [];
    applicantLines.push(`Hi ${safeName},`);
    applicantLines.push('');
    applicantLines.push(`Thanks for applying for "${jobTitle}" via Fizzy Juice.`);
    applicantLines.push('The employer has received your application and they will contact you directly if they would like to move forward.');
    applicantLines.push('');
    applicantLines.push('Best of luck,');
    applicantLines.push('Fizzy Juice');
    const applicantBody = applicantLines.join('\n');

    await mailTransporter.sendMail({
      from: EMAIL_FROM,
      to: applicantEmail,
      subject: `We've sent your application for ${jobTitle}`,
      text: applicantBody,
    });

    return res.status(200).json({ ok: true, emailSent: true });
  } catch (err: any) {
    console.error('[ApplyEmail API] Failed to send application email', err);
    const message = (err && (err.message || err.toString())) || 'Failed to send application email';
    return res.status(500).json({ error: message });
  }
};
