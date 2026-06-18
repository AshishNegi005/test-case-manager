const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  // Dev fallback: log emails instead of sending
  return null;
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
    return;
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"TCM System" <noreply@tcm.local>',
    to,
    subject,
    html,
  });
};

const notifyTestAssignment = async ({ assigneeEmail, assigneeName, testCaseTitle, projectName, assignerName }) => {
  await sendEmail({
    to: assigneeEmail,
    subject: `[TCM] Test case assigned to you: ${testCaseTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#6366f1">Test Case Assigned</h2>
        <p>Hi <strong>${assigneeName}</strong>,</p>
        <p><strong>${assignerName}</strong> assigned a test case to you in project <strong>${projectName}</strong>.</p>
        <div style="background:#f1f5f9;padding:12px;border-radius:6px;margin:16px 0">
          <strong>${testCaseTitle}</strong>
        </div>
        <p>Log in to TCM to view the details.</p>
      </div>
    `,
  });
};

const notifyProjectMembership = async ({ memberEmail, memberName, projectName, role, addedByName }) => {
  await sendEmail({
    to: memberEmail,
    subject: `[TCM] You've been added to project: ${projectName}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#6366f1">Project Access Granted</h2>
        <p>Hi <strong>${memberName}</strong>,</p>
        <p><strong>${addedByName}</strong> added you to project <strong>${projectName}</strong> with role <strong>${role}</strong>.</p>
        <p>Log in to TCM to access the project.</p>
      </div>
    `,
  });
};

module.exports = { sendEmail, notifyTestAssignment, notifyProjectMembership };
