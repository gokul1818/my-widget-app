/**
 * Serverless API Function: /api/notify
 * Sends email and Firebase Cloud Messaging (FCM) push notifications to team members
 * when a colleague changes their attendance status.
 * Supports:
 * 1. Modern Firebase Cloud Messaging HTTP v1 API (Service Account Credentials)
 * 2. Legacy Firebase FCM API (Server Key)
 * 3. Resend API for corporate email notifications
 * 4. Safe dev / simulated logger
 */

import crypto from 'node:crypto';

/**
 * Generates a Google OAuth2 access token for Firebase Cloud Messaging HTTP v1 API
 */
async function getGoogleAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })
  ).toString('base64url');

  const rawKey = privateKey.trim().replace(/^['"]|['"]$/g, '');
  const formattedKey = rawKey.replace(/\\n/g, '\n');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${claim}`);
  const signature = sign.sign(formattedKey, 'base64url');
  const jwt = `${header}.${claim}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to obtain Google access token: ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const {
      teamName = 'Team',
      teamCode = '',
      changedBy = {},
      oldStatus = '',
      newStatus = 'office',
      dateStr = 'Tomorrow',
      recipients = [],
      pushTokens = [],
    } = body || {};

    const recipientEmails = Array.isArray(recipients)
      ? recipients
          .map((r) => (typeof r === 'string' ? r : r.email))
          .filter((e) => Boolean(e) && e.includes('@'))
      : [];

    const cleanPushTokens = Array.isArray(pushTokens)
      ? pushTokens.filter((t) => Boolean(t) && typeof t === 'string' && t.trim().length > 0)
      : [];

    if (recipientEmails.length === 0 && cleanPushTokens.length === 0) {
      return res.status(200).json({
        success: true,
        delivered: false,
        skipped: true,
        message: 'No email or push recipients to intimate.',
      });
    }

    // Build rich corporate status labels
    const statusLabel =
      newStatus === 'office' ? 'Working from Office' :
      newStatus === 'wfh' ? 'Working from Home (WFH)' :
      'On Leave';
    const statusBadge =
      newStatus === 'office' ? 'Office' :
      newStatus === 'wfh' ? 'Remote / WFH' :
      'On Leave';
    const statusEmoji = newStatus === 'office' ? '🏢' : newStatus === 'wfh' ? '🏠' : '🌴';
    const statusColor = newStatus === 'office' ? '#059669' : newStatus === 'wfh' ? '#2563eb' : '#d97706';
    const statusBg = newStatus === 'office' ? '#ecfdf5' : newStatus === 'wfh' ? '#eff6ff' : '#fffbeb';
    const statusBorder = newStatus === 'office' ? '#a7f3d0' : newStatus === 'wfh' ? '#bfdbfe' : '#fde68a';

    const memberName = changedBy?.name || 'A team member';
    const memberEmail = changedBy?.email || '';
    const dateFormatted = dateStr || 'Tomorrow';

    const subject = `[Attendance Update] ${memberName} is ${statusBadge} on ${dateFormatted} (${teamName})`;

    // 1. Process Firebase Cloud Messaging (FCM) Push Notifications
    let pushResult = {
      attempted: cleanPushTokens.length > 0,
      delivered: false,
      count: cleanPushTokens.length,
      provider: 'none',
    };

    const pushTitle = `${statusEmoji} ${memberName} is ${statusBadge} (${dateFormatted})`;
    const pushBody = oldStatus && oldStatus !== newStatus
      ? `${memberName} changed attendance in ${teamName} from ${oldStatus} to ${statusBadge} for ${dateFormatted}.`
      : `${memberName} checked in as ${statusBadge} in ${teamName} for ${dateFormatted}.`;

    if (cleanPushTokens.length > 0) {
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
      const fcmServerKey = process.env.FIREBASE_SERVER_KEY || process.env.FCM_SERVER_KEY;

      // Method 1: Modern Firebase Cloud Messaging HTTP v1 API (Google Service Account)
      if (clientEmail && privateKey && projectId) {
        try {
          const accessToken = await getGoogleAccessToken(clientEmail, privateKey);
          let successCount = 0;

          // Dispatch to each token via HTTP v1
          const sendPromises = cleanPushTokens.map(async (token) => {
            const v1Payload = {
              message: {
                token,
                notification: {
                  title: pushTitle,
                  body: pushBody,
                },
                data: {
                  teamName,
                  teamCode,
                  memberName,
                  newStatus,
                  oldStatus,
                  dateStr: dateFormatted,
                  url: '/',
                },
                webpush: {
                  notification: {
                    icon: '/favicon.svg',
                    badge: '/favicon.svg',
                  },
                  fcm_options: {
                    link: '/',
                  },
                },
              },
            };

            const v1Res = await fetch(
              `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(v1Payload),
              }
            );

            if (v1Res.ok) {
              successCount += 1;
            } else {
              const errBody = await v1Res.text();
              console.warn('[FCM HTTP v1 Error for token]:', errBody);
            }
            return v1Res.ok;
          });

          await Promise.all(sendPromises);

          pushResult = {
            attempted: true,
            delivered: successCount > 0,
            count: successCount,
            provider: 'firebase_fcm_v1',
          };
          console.log(`[FCM HTTP v1] Dispatched push to ${cleanPushTokens.length} devices (Success: ${successCount})`);
        } catch (v1Err) {
          console.warn('[FCM HTTP v1] Error sending message:', v1Err);
          pushResult = {
            attempted: true,
            delivered: false,
            count: cleanPushTokens.length,
            provider: 'firebase_fcm_v1',
            error: v1Err.message,
          };
        }
      } else if (fcmServerKey) {
        // Method 2: Legacy FCM API (Server Key)
        try {
          const fcmPayload = {
            registration_ids: cleanPushTokens,
            notification: {
              title: pushTitle,
              body: pushBody,
              icon: '/favicon.svg',
              badge: '/favicon.svg',
              click_action: '/',
            },
            data: {
              teamName,
              teamCode,
              memberName,
              newStatus,
              oldStatus,
              dateStr: dateFormatted,
              url: '/',
            },
          };

          const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              Authorization: `key=${fcmServerKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(fcmPayload),
          });

          const fcmData = await fcmRes.json();
          pushResult = {
            attempted: true,
            delivered: fcmRes.ok && fcmData.success > 0,
            count: fcmData.success || 0,
            provider: 'firebase_fcm_legacy',
            fcmResponse: fcmData,
          };
          console.log(`[FIREBASE FCM LEGACY] Sent to ${cleanPushTokens.length} tokens. Success: ${fcmData.success || 0}`);
        } catch (fcmErr) {
          console.warn('[FIREBASE FCM] Dispatch error:', fcmErr);
          pushResult = {
            attempted: true,
            delivered: false,
            count: cleanPushTokens.length,
            provider: 'firebase_fcm_legacy',
            error: fcmErr.message,
          };
        }
      } else {
        // Method 3: Safe Dev / Local Mode for Push
        console.log(`[FCM PUSH (DEV/MOCK)] Title: "${pushTitle}" | Body: "${pushBody}" | Recipients: ${cleanPushTokens.length} devices.`);
        pushResult = {
          attempted: true,
          delivered: true,
          simulated: true,
          count: cleanPushTokens.length,
          provider: 'fcm_dev_dispatcher',
        };
      }
    }

    // 2. Process Email Notifications (Resend / Dev)
    let emailResult = {
      attempted: recipientEmails.length > 0,
      delivered: false,
      count: recipientEmails.length,
      provider: 'none',
    };

    if (recipientEmails.length > 0) {
      const textContent = `
Attendance Status Update | ${teamName}${teamCode ? ` [${teamCode}]` : ''}
--------------------------------------------------

Dear Team,

Please be informed that ${memberName} has updated their attendance status for ${dateFormatted}.

Change Summary:
• Team Member: ${memberName}${memberEmail ? ` (${memberEmail})` : ''}
• Current Status: ${statusEmoji} ${statusLabel}
${oldStatus ? `• Previous Status: ${oldStatus}\n` : ''}• Effective Date: ${dateFormatted}

This update has been synchronized with the team roster. Please review the Office Team Roster application to coordinate your schedule.

Best regards,
Office Team Roster Operations
`.trim();

      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 24px 28px 20px 28px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 9999px; background-color: #f1f5f9; color: #0f172a; border: 1px solid #e2e8f0;">
                      TEAM ATTENDANCE NOTICE
                    </span>
                    <h1 style="margin: 12px 0 4px 0; font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.25;">
                      ${teamName} <span style="font-size: 14px; font-weight: 600; color: #64748b;">(${teamCode || 'Roster'})</span>
                    </h1>
                    <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: 500;">
                      Effective Date: <strong style="color: #334155;">${dateFormatted}</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 28px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Dear Team,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Please be informed that <strong>${memberName}</strong> has updated their attendance status for <strong>${dateFormatted}</strong>.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid ${statusColor}; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 12px;">
                      Status Change Summary
                    </div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #64748b; width: 140px;">Team Member:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 700;">
                          ${memberName}
                          ${memberEmail ? `<div style="font-size: 12px; color: #2563eb; font-weight: 500;">${memberEmail}</div>` : ''}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #64748b;">Current Status:</td>
                        <td style="padding: 6px 0;">
                          <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; background-color: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; font-size: 13px; font-weight: 700;">
                            ${statusEmoji} ${statusLabel}
                          </span>
                        </td>
                      </tr>
                      ${oldStatus ? `
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #64748b;">Previous Status:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #64748b; font-weight: 500;">${oldStatus}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #64748b;">Date:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 700;">${dateFormatted}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                This notification has been dispatched automatically to keep the team aligned. You can review the complete roster anytime in the Office Team Roster application.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
              Office Team Roster Operations • Automated Dispatch System
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        try {
          const fromAddress = process.env.EMAIL_FROM || 'Office Roster <onboarding@resend.dev>';
          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromAddress,
              to: recipientEmails,
              subject,
              html: htmlContent,
              text: textContent,
            }),
          });

          const resendData = await resendRes.json();
          if (resendRes.ok) {
            emailResult = {
              attempted: true,
              delivered: true,
              provider: 'resend',
              emailId: resendData.id,
              count: recipientEmails.length,
            };
          } else {
            console.warn('Resend API error:', resendData);
          }
        } catch (sendErr) {
          console.error('Failed to dispatch via Resend:', sendErr);
        }
      } else {
        console.log(`[EMAIL NOTIFICATION (DEV/MOCK)] Team: ${teamName} | Status: ${statusLabel} | By: ${changedBy.name} (${changedBy.email}) | Sent to: ${recipientEmails.join(', ')}`);
        emailResult = {
          attempted: true,
          delivered: true,
          simulated: true,
          provider: 'dev_notifier',
          count: recipientEmails.length,
        };
      }
    }

    return res.status(200).json({
      success: true,
      delivered: emailResult.delivered || pushResult.delivered,
      email: emailResult,
      push: pushResult,
      pushMessage: { title: pushTitle, body: pushBody },
      recipients: recipientEmails,
      pushTokensCount: cleanPushTokens.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Notification error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
