<?php

use App\Http\Controllers\AccountController;
use Illuminate\Support\Facades\Route;

// The universal account surface. Whichever app's UI calls these, the change
// lands on the one accounts row every app reads, so edits reflect everywhere.
Route::middleware('auth')->prefix('api')->group(function () {
    Route::get('/accounts/{account}/universal', [AccountController::class, 'universal']);
    Route::patch('/accounts/{account}/universal', [AccountController::class, 'updateUniversal']);
});
