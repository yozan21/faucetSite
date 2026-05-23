export const welcomeEmailTemplate = (
  username: string,
  token: string,
): string => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Welcome to FaucetSite, ${username}! 🎉</h2>
    <p>Your account has been created successfully.</p>
    <p>Here is your account recovery token — you will need this to verify your email and reset your password:</p>
    <div style="background: #f4f4f4; padding: 16px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 14px; letter-spacing: 1px; margin: 16px 0;">
      ${token}
    </div>
    <p style="color: #e53e3e;"><strong>⚠️ Important — please read carefully:</strong></p>
    <ul>
      <li>Save this token somewhere safe — write it down or store in a password manager</li>
      <li>This is the <strong>only time</strong> we will send this to you</li>
      <li>We will NEVER ask for this token except on the verify email and password reset pages</li>
      <li>If you lose this token, contact our support team on Discord</li>
      <li>Do not share this with anyone including our staff</li>
    </ul>
    <p>Happy earning! 🚀</p>
  </div>
`;

export const verificationEmailTemplate = (username: string, otp: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Verify your email</h2>
    <p>Hi <strong>${username}</strong>,</p>
    <p>Your verification code is:</p>
    <h1 style="letter-spacing: 8px; color: #4F46E5;">${otp}</h1>
    <p>This code expires in <strong>10 minutes</strong>.</p>
    <p>If you didn't create an account, ignore this email.</p>
  </div>
`;

export const forgotPasswordTemplate = (username: string, otp: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Reset your password</h2>
    <p>Hi <strong>${username}</strong>,</p>
    <p>Your password reset code is:</p>
    <h1 style="letter-spacing: 8px; color: #4F46E5;">${otp}</h1>
    <p>This code expires in <strong>10 minutes</strong>.</p>
    <p>If you didn't request this, ignore this email.</p>
  </div>
`;

export const inviteCodeTemplate = (
  email: string,
  inviteCode: string,
  expiresAt: Date,
): string => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>You're invited!</h2>
    <p>Your early access request for <strong>${email}</strong> has been approved.</p>
    <p>Use this invite code to register:</p>
    <h1 style="letter-spacing: 8px; color: #4F46E5;">${inviteCode}</h1>
    <p>This code expires on <strong>${expiresAt.toDateString()}</strong>.</p>
    <p>If you didn't request early access, ignore this email.</p>
  </div>
`;
export const passwordResetAlertTemplate = (
  username: string,
  ip: string,
  country: string,
  date: Date,
): string => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Your password was reset</h2>
    <p>Hi <strong>${username}</strong>,</p>
    <p>Your account password was successfully reset. Here are the details:</p>
    <div style="background: #f4f4f4; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="color: #666; padding: 6px 0;">Date & Time</td>
          <td style="font-weight: bold;">${date.toUTCString()}</td>
        </tr>
        <tr>
          <td style="color: #666; padding: 6px 0;">IP Address</td>
          <td style="font-weight: bold;">${ip}</td>
        </tr>
        <tr>
          <td style="color: #666; padding: 6px 0;">Country</td>
          <td style="font-weight: bold;">${country}</td>
        </tr>
      </table>
    </div>
    <p style="color: #e53e3e;"><strong>⚠️ If this wasn't you:</strong></p>
    <ul>
      <li>Your recovery token may be compromised</li>
      <li>Contact our support team on Discord immediately</li>
      <li>Do not login until you have spoken to support</li>
    </ul>
    <p>If this was you, no action is needed.</p>
  </div>
`;
