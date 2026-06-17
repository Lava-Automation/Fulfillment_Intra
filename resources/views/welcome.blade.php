{{-- resources/views/welcome.blade.php --}}
{{-- Thin mount point. @viteReactRefresh MUST come before @vite or React Fast --}}
{{-- Refresh throws "can't detect preamble" in dev. No-op in production builds. --}}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lava Fulfillment</title>
  @viteReactRefresh
  @vite(['resources/js/app.jsx'])
</head>
<body>
  <div id="app"></div>
</body>
</html>
