<?php

use App\Http\Controllers\ClientProfileController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->prefix('api')->group(function () {
    Route::get('/client-profiles', [ClientProfileController::class, 'index']);          // accounts list
    Route::get('/client-profiles/{account}', [ClientProfileController::class, 'show']);  // one account's full profile

    Route::patch('/client-profiles/{account}/va/assign', [ClientProfileController::class, 'assignVa']);
    Route::patch('/client-profiles/{account}/va/remove', [ClientProfileController::class, 'removeVa']);
    Route::post('/client-profiles/{account}/team', [ClientProfileController::class, 'assignTeam']);
    Route::delete('/client-profiles/{account}/team', [ClientProfileController::class, 'removeTeam']);
    Route::patch('/client-profiles/{account}/tech-tools', [ClientProfileController::class, 'updateTechTools']);
});
