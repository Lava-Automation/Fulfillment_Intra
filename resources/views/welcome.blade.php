{{-- resources/views/welcome.blade.php --}}
{{-- Thin mount point. @viteReactRefresh MUST come before @vite or React Fast --}}
{{-- Refresh throws "can't detect preamble" in dev. No-op in production builds. --}}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <title>Lava Fulfillment</title>
  {{-- The current user's full identity, resolved on the server (CurrentEmployee
       maps the logged-in account to its employees row). useSession reads this
       directly — the React shell no longer queries the DB for identity. --}}
  <script>
    window.__AUTH__ = @json(app(\App\Support\CurrentEmployee::class)->toArray());
  </script>
  @viteReactRefresh
  @vite(['resources/js/app.jsx'])
</head>
<body>
  <div id="app"></div>
</body>
</html>
