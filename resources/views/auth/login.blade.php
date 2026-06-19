<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in — LAVA Fulfillment</title>
  <style>
    :root { --dark:#24242D; --red:#E73835; --white:#FFFFFF; }
    * { box-sizing: border-box; }
    body {
      margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
      background:var(--dark); color:var(--white);
      font-family: 'Poppins', system-ui, -apple-system, Segoe UI, sans-serif;
    }
    .card { width:340px; text-align:center; padding:8px; }
    .brand { font-weight:700; font-size:22px; margin-bottom:6px; }
    .brand span { color:var(--red); }
    .sub { color:#b9b9c2; font-size:13px; margin-bottom:20px; line-height:1.5; }
    input[type=email] {
      width:100%; padding:11px 12px; border-radius:8px; border:none; margin-bottom:10px;
      font-size:14px; font-family:inherit;
    }
    button {
      width:100%; padding:11px 12px; border-radius:8px; border:none; background:var(--red);
      color:var(--white); font-weight:600; font-size:14px; cursor:pointer; font-family:inherit;
    }
    button:hover { filter:brightness(1.07); }
    .error { color:#ffb4b3; font-size:12px; margin-bottom:10px; }
    .alert { background:rgba(231,56,53,.12); border:1px solid #6e2a29; border-radius:8px;
      padding:11px 13px; font-size:12.5px; color:#ffc9c8; margin-bottom:14px; line-height:1.5; }
    .notice { background:rgba(255,255,255,.06); border:1px solid #3a3a44; border-radius:8px;
      padding:16px; font-size:13px; color:#d6d6de; line-height:1.55; }
    .notice b { color:var(--white); }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">LAVA <span>Fulfillment</span></div>

    @if (session('error'))
      <div class="alert">{{ session('error') }}</div>
    @endif

    @if (session('status') === 'link-sent')
      <div class="notice">
        Check your inbox — we sent a sign-in link to <b>{{ session('sent_to') }}</b>.<br>
        Click <b>Verify &amp; sign in</b> in that email. The link expires in 30 minutes.
      </div>
    @else
      <p class="sub">Sign in with your Lava email to continue.</p>
      <form method="POST" action="{{ route('login.send') }}">
        @csrf
        @error('email')
          <div class="error">{{ $message }}</div>
        @enderror
        <input type="email" name="email" value="{{ old('email') }}"
               placeholder="you@lavaautomation.com" autofocus required>
        <button type="submit">Send sign-in link</button>
      </form>
    @endif
  </div>
</body>
</html>
