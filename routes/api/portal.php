<?php

use App\Http\Controllers\PortalController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->prefix('api')->group(function () {
    Route::get('/portal/accounts', [PortalController::class, 'accounts']);
    Route::get('/portal/accounts/{account}', [PortalController::class, 'accountDetail']);
    Route::get('/portal/dashboard', [PortalController::class, 'dashboard']);
    Route::get('/portal/tickets', [PortalController::class, 'tickets']);
    Route::get('/portal/meetings', [PortalController::class, 'meetings']);
    Route::get('/portal/trainers', [PortalController::class, 'trainers']);
    Route::get('/portal/va-overview', [PortalController::class, 'vaOverview']);

    Route::patch('/portal/meetings/{meeting}', [PortalController::class, 'updateMeeting']);
});
