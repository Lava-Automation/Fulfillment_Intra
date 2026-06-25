<?php

use App\Http\Controllers\LogController;
use Illuminate\Support\Facades\Route;

// Activity logs: in-app changes (audit trail) + feature/code changes (changelog).
Route::middleware('auth')->prefix('api')->group(function () {
    Route::get('/activity-log', [LogController::class, 'activity']);
    Route::get('/dev-log', [LogController::class, 'dev']);
});
