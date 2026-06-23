<?php

use App\Http\Controllers\OptionController;
use Illuminate\Support\Facades\Route;

// Universal option pool — the values every dropdown across the hub reads from.
// index() is the one fetch the SPA caches; the rest are the admin "manage
// dropdown values" surface.
Route::middleware('auth')->prefix('api')->group(function () {
    Route::get('/options', [OptionController::class, 'index']);                 // all active, grouped by category
    Route::get('/options/{category}', [OptionController::class, 'show']);        // one category incl. inactive (admin)
    Route::post('/options', [OptionController::class, 'store']);                 // add a value
    Route::patch('/options/{option}', [OptionController::class, 'update']);      // edit label/order/active
    Route::delete('/options/{option}', [OptionController::class, 'destroy']);    // retire (deactivate)
});
