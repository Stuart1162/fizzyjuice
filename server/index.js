/* Simple Stripe test server for Checkout Sessions */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001'] }));
app.use(express.json());

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const NODE_ENV = process.env.NODE_ENV || 'development';
if (!STRIPE_SECRET_KEY) {
  console.warn('[Stripe] STRIPE_SECRET_KEY missing in environment. Set it in .env');
}
const stripe = require('stripe')(STRIPE_SECRET_KEY || '');

// Basic Nodemailer transport for application emails
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587', 10);
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;

let mailTransporter = null;
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
  console.warn('[ApplyEmail] EMAIL_HOST/EMAIL_USER/EMAIL_PASS not fully configured; application emails are disabled');
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

async function handleCreateCheckoutSession(req, res) {
  try {
    if (!STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured on server' });
    }
    const { title, successUrl, cancelUrl, currency = 'gbp' } = req.body || {};

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: title || 'Job Post Credit',
            },
            unit_amount: 1000, // £10.00 test
          },
          quantity: 1,
        },
      ],
      success_url: successUrl || 'http://localhost:3000/post-job?paid=1',
      cancel_url: cancelUrl || 'http://localhost:3000/post-job?paid=0',
      metadata: {
        kind: 'job_post',
      },
    });
    res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('[Stripe] create-checkout-session error', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
}

// Legacy/root route
app.post('/create-checkout-session', handleCreateCheckoutSession);
// API-style routes for frontend compatibility
app.post('/api/create-checkout-session', handleCreateCheckoutSession);
app.post('/api/payments-create-session', handleCreateCheckoutSession);

// Job application email endpoint
app.post('/api/apply-via-email', async (req, res) => {
  try {
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
    } = req.body || {};

    // In development, if email is not configured, simulate a send so the
    // frontend flow can be tested without real SMTP credentials.
    if (!mailTransporter || !EMAIL_FROM) {
      if (NODE_ENV !== 'production') {
        console.warn('[ApplyEmail] Mail transport not configured; simulating application email in non-production env');
        console.info('[ApplyEmail] Application payload', {
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
        return res.json({ ok: true, emailSent: false });
      }
      return res.status(500).json({ error: 'Application email not configured on server' });
    }

    if (!employerEmail || !jobTitle || !applicantEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const safeName = applicantName || 'A Fizzy Juice candidate';
    const safeCover = coverLetter || '(No cover letter provided)';

    const lines = [];
    lines.push(`${safeName} has applied for your role "${jobTitle}" on Fizzy Juice.`);
    if (jobId) {
      lines.push(`Job ID: ${jobId}`);
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
    const applicantLines = [];
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
      subject: `We\'ve sent your application for ${jobTitle}`,
      text: applicantBody,
    });

    res.json({ ok: true, emailSent: true });
  } catch (err) {
    console.error('[ApplyEmail] Failed to send application email', err);
    res.status(500).json({ error: 'Failed to send application email' });
  }
});

const port = process.env.PORT || 4242;
app.listen(port, () => {
  console.log(`[stripe-server] listening on http://localhost:${port}`);
});
