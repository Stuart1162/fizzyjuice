import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const PrivacyPolicy: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Box>
        <Typography component="h1" variant="h3" gutterBottom>
          Privacy policy
        </Typography>

        <Typography variant="subtitle1" gutterBottom>
          fizzyjuice.uk
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" paragraph>
          Last updated: 26 March 2026
        </Typography>

        <Typography variant="h5" gutterBottom>
          1. Who We Are
        </Typography>
        <Typography variant="body1" paragraph>
          Fizzy Juice (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the website fizzyjuice.uk, an online job board
          connecting employers and job seekers. We are committed to protecting your personal data and
          complying with the UK General Data Protection Regulation (UK GDPR) and the Data Protection
          Act 2018.
        </Typography>
        <Typography variant="body1" paragraph>
          For questions about this policy or how we handle your data, please contact us at:
          {' '}
          privacy@fizzyjuice.uk
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          2. What Personal Data We Collect
        </Typography>
        <Typography variant="body1" paragraph>
          When you register or interact with our site, we may collect the following personal
          information:
        </Typography>
        <Typography variant="body1" component="div" paragraph>
          <ul>
            <li>Full name</li>
            <li>Email address</li>
            <li>Telephone number</li>
            <li>Technical data via Google Analytics (see Section 5)</li>
          </ul>
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          3. Why We Collect Your Data
        </Typography>
        <Typography variant="body1" paragraph>
          We collect and use your personal data for the following purposes:
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Account Registration &amp; Job Applications
        </Typography>
        <Typography variant="body1" component="div" paragraph>
          <ul>
            <li>To create and manage your account on fizzyjuice.uk</li>
            <li>To allow you to apply for jobs or post job listings</li>
            <li>To connect job seekers with prospective employers</li>
            <li>To send you relevant job alerts or application updates</li>
          </ul>
        </Typography>

        <Typography variant="subtitle1" gutterBottom>
          Communications
        </Typography>
        <Typography variant="body1" component="div" paragraph>
          <ul>
            <li>To respond to your enquiries or support requests</li>
            <li>To send service-related notifications (e.g. application status updates)</li>
          </ul>
        </Typography>

        <Typography variant="subtitle1" gutterBottom>
          Legal Basis for Processing
        </Typography>
        <Typography variant="body1" paragraph>
          Under UK GDPR, we process your personal data on the following legal bases:
        </Typography>
        <Typography variant="body1" component="div" paragraph>
          <ul>
            <li>
              Contract – processing is necessary to provide our job board service to you
            </li>
            <li>
              Legitimate interests – to improve our service and communicate with users
            </li>
            <li>
              Consent – where we rely on your consent (e.g. marketing emails), you may withdraw it at
              any time
            </li>
          </ul>
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          4. How We Store &amp; Protect Your Data
        </Typography>
        <Typography variant="body1" paragraph>
          Your data is stored securely. We use appropriate technical and organisational measures to
          protect your personal information against unauthorised access, loss, or disclosure.
        </Typography>
        <Typography variant="body1" paragraph>
          We retain your personal data for as long as your account is active, or as long as necessary
          to provide our services. You may request deletion of your data at any time (see Section 7).
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          5. Google Analytics &amp; Cookies
        </Typography>
        <Typography variant="body1" paragraph>
          We use Google Analytics to understand how visitors use our website. Google Analytics
          collects information such as:
        </Typography>
        <Typography variant="body1" component="div" paragraph>
          <ul>
            <li>Pages visited and time spent on the site</li>
            <li>Your approximate geographic location (country/city level)</li>
            <li>Device type and browser</li>
            <li>How you arrived at our site (e.g. search engine, direct link)</li>
          </ul>
        </Typography>
        <Typography variant="body1" paragraph>
          This data is collected using cookies and is processed by Google LLC. It does not directly
          identify you as an individual. Google may transfer this data outside the UK/EEA in
          accordance with their own privacy terms.
        </Typography>
        <Typography variant="body1" paragraph>
          You can opt out of Google Analytics tracking by installing the Google Analytics Opt-out
          Browser Add-on, available at:
          {' '}
          <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">
            https://tools.google.com/dlpage/gaoptout
          </a>
        </Typography>
        <Typography variant="body1" paragraph>
          For more information on how Google uses your data, visit:
          {' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            https://policies.google.com/privacy
          </a>
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          6. Who We Share Your Data With
        </Typography>
        <Typography variant="body1" paragraph>
          We do not sell your personal data. We may share your data only in the following
          circumstances:
        </Typography>
        <Typography variant="body1" component="div" paragraph>
          <ul>
            <li>
              With employers when you apply for a job listing on our platform (name, email,
              telephone)
            </li>
            <li>
              With trusted third-party service providers who help us operate our website (e.g.
              hosting providers), bound by confidentiality obligations
            </li>
            <li>With Google LLC for analytics purposes (see Section 5)</li>
            <li>
              Where required by law or to protect the rights, property, or safety of fizzyjuice.uk or
              others
            </li>
          </ul>
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          7. Your Rights Under UK GDPR
        </Typography>
        <Typography variant="body1" paragraph>
          You have the following rights regarding your personal data:
        </Typography>
        <Typography variant="body1" component="div" paragraph>
          <ul>
            <li>Right of access – request a copy of the data we hold about you</li>
            <li>Right to rectification – ask us to correct inaccurate or incomplete data</li>
            <li>Right to erasure – request deletion of your personal data (&quot;right to be forgotten&quot;)</li>
            <li>Right to restrict processing – ask us to limit how we use your data</li>
            <li>
              Right to data portability – receive your data in a structured, machine-readable format
            </li>
            <li>
              Right to object – object to processing based on legitimate interests or for direct
              marketing
            </li>
            <li>
              Rights related to automated decision-making – we do not use automated decision-making or
              profiling
            </li>
          </ul>
        </Typography>
        <Typography variant="body1" paragraph>
          To exercise any of these rights, please contact us at privacy@fizzyjuice.uk. We will
          respond within one month of receiving your request.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          8. Third-Party Links
        </Typography>
        <Typography variant="body1" paragraph>
          Our website may contain links to third-party websites. We are not responsible for the
          privacy practices of those sites and encourage you to read their privacy policies before
          providing any personal information.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          9. Children&apos;s Privacy
        </Typography>
        <Typography variant="body1" paragraph>
          Our service is not directed at children under the age of 16. We do not knowingly collect
          personal data from children. If you believe a child has provided us with personal
          information, please contact us and we will delete it promptly.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          10. Changes to This Policy
        </Typography>
        <Typography variant="body1" paragraph>
          We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at the top of
          this page will reflect any changes. We encourage you to review this policy periodically.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          11. How to Make a Complaint
        </Typography>
        <Typography variant="body1" paragraph>
          If you have concerns about how we handle your personal data, you have the right to lodge a
          complaint with the Information Commissioner&apos;s Office (ICO), the UK supervisory authority
          for data protection:
        </Typography>
        <Typography variant="body1" component="div" paragraph>
          <ul>
            <li>
              Website:
              {' '}
              <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">
                https://ico.org.uk
              </a>
            </li>
            <li>Phone: 0303 123 1113</li>
          </ul>
        </Typography>
        <Typography variant="body1" paragraph>
          We would, however, appreciate the opportunity to address your concerns before you contact
          the ICO. Please reach out to us first at info@fizzyjuice.uk.
        </Typography>
      </Box>
    </Container>
  );
};

export default PrivacyPolicy;
