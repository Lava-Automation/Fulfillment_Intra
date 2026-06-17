<?php

use Illuminate\Support\Facades\Route;

// The hub is a React SPA with client-side (path-based) routing. Laravel serves
// the same shell for every path so deep links and refreshes (e.g. /dev-support)
// boot the SPA and let React Router resolve the route. Keep this last.
Route::get('/{any?}', function () {
    return view('welcome');
})->where('any', '.*');
