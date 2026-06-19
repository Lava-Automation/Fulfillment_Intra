<?php

use App\Http\Controllers\QaqcController;
use Illuminate\Support\Facades\Route;

// QAQC Build Review Tracker — JSON data endpoints for the React app
// (apps/qaqc/index.jsx). Session-authenticated, same origin, CSRF-protected.
Route::middleware('auth')->prefix('api')->group(function () {
    Route::get('/qaqc', [QaqcController::class, 'index']);
    Route::post('/qaqc/builds', [QaqcController::class, 'storeBuild']);
    Route::patch('/qaqc/builds/{build}/status', [QaqcController::class, 'updateStatus']);
    Route::patch('/qaqc/builds/{build}/field', [QaqcController::class, 'updateField']);
    Route::patch('/qaqc/builds/{build}/reviewers', [QaqcController::class, 'updateReviewers']);
    Route::patch('/qaqc/builds/{build}', [QaqcController::class, 'updateBuild']);
});
