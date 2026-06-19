<?php

use App\Http\Controllers\Auth\MagicLinkController;
use App\Http\Controllers\TrainerWorkloadController;
use Illuminate\Support\Facades\Route;

// Passwordless magic-link auth. These explicit routes are declared BEFORE the
// SPA catch-all so they win the match.
Route::middleware('guest')->group(function () {
    Route::get('/login', [MagicLinkController::class, 'show'])->name('login');
    Route::post('/login', [MagicLinkController::class, 'send'])
        ->middleware('throttle:6,1')->name('login.send');
});

Route::get('/auth/verify/{user}', [MagicLinkController::class, 'verify'])
    ->middleware('signed')->name('auth.verify');

Route::post('/logout', [MagicLinkController::class, 'logout'])
    ->middleware('auth')->name('logout');

// ── Phase 2: JSON data endpoints for the SPA apps (session-authenticated, same
// origin, CSRF-protected). Each migrated app fetches /api/* instead of querying
// Supabase from the browser. Prefixed with /api so they don't collide with the
// SPA's own paths handled by the catch-all below. ──
Route::middleware('auth')->prefix('api')->group(function () {
    Route::get('/trainer-workload', [TrainerWorkloadController::class, 'index']);
    Route::post('/training-sessions', [TrainerWorkloadController::class, 'storeSession']);
    Route::patch('/training-sessions/{session}', [TrainerWorkloadController::class, 'updateSession']);
    Route::delete('/training-sessions/{session}', [TrainerWorkloadController::class, 'destroySession']);
    Route::post('/evaluations', [TrainerWorkloadController::class, 'storeEvaluation']);
});

// Per-app JSON route files (one per migrated app: training, qaqc, devsupport,
// clientprofile, portal). Each lives in routes/api/<app>.php and registers its
// own auth+/api group. Loaded here so they sit before the SPA catch-all.
foreach (glob(__DIR__.'/api/*.php') ?: [] as $appRoutes) {
    require $appRoutes;
}

// The hub is a React SPA with client-side (path-based) routing. Laravel serves
// the same shell for every path so deep links and refreshes (e.g. /dev-support)
// boot the SPA and let React Router resolve the route. Now GATED behind auth —
// unauthenticated requests are redirected to the login route. Keep this last.
Route::get('/{any?}', function () {
    return view('welcome');
})->where('any', '.*')->middleware('auth');
