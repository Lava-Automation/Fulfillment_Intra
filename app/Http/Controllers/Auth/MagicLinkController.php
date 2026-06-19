<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\LoginLinkMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

// Passwordless "magic link" login, restricted to @lavaautomation.com. The user
// enters their company email, we mail a signed, time-limited link, and clicking
// it logs them in. No passwords are ever used (the column is satisfied with a
// random hash). This is the gate that protects the hosted hub; all real data
// access still happens client-side against Supabase until the Phase 2 refactor.
class MagicLinkController extends Controller
{
    public function show()
    {
        return view('auth.login');
    }

    public function send(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'regex:/@lavaautomation\.com$/i'],
        ], [
            'email.regex' => 'Use your @lavaautomation.com email address.',
        ]);

        $email = Str::lower($data['email']);

        $user = User::firstOrCreate(
            ['email' => $email],
            ['name' => Str::before($email, '@'), 'password' => Hash::make(Str::random(40))],
        );

        $url = URL::temporarySignedRoute(
            'auth.verify',
            now()->addMinutes(30),
            ['user' => $user->id],
        );

        Mail::to($email)->send(new LoginLinkMail($url));

        return back()
            ->with('status', 'link-sent')
            ->with('sent_to', $email);
    }

    public function verify(Request $request, User $user)
    {
        // The 'signed' middleware has already validated the signature + expiry.
        Auth::login($user, remember: true);

        if (! $user->email_verified_at) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        $request->session()->regenerate();

        return redirect('/');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
