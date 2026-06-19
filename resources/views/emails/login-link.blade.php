<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0; padding:0; background:#f4f4f6; font-family:'Poppins', system-ui, -apple-system, Segoe UI, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background:#ffffff; border-radius:12px; overflow:hidden;">
          <tr>
            <td style="background:#24242D; padding:24px 28px; color:#ffffff; font-size:20px; font-weight:700;">
              LAVA <span style="color:#E73835;">Fulfillment</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 14px; font-size:15px; color:#1B120B;">Hi,</p>
              <p style="margin:0 0 22px; font-size:14px; color:#444; line-height:1.6;">
                Click the button below to sign in to LAVA Fulfillment. This link is for your
                account only and expires in <b>30 minutes</b>.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
                <tr>
                  <td style="border-radius:8px; background:#E73835;">
                    <a href="{{ $url }}"
                       style="display:inline-block; padding:12px 24px; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none;">
                      Verify &amp; sign in
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px; font-size:12px; color:#888; line-height:1.6;">
                If the button doesn't work, copy and paste this URL into your browser:
              </p>
              <p style="margin:0; font-size:12px; color:#E73835; word-break:break-all;">{{ $url }}</p>
              <p style="margin:22px 0 0; font-size:12px; color:#999;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
