<?php

use App\Http\Controllers\DevSupportController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->prefix('api')->group(function () {
    Route::get('/devsupport', [DevSupportController::class, 'index']);
    Route::get('/devsupport/tickets/{ticket}/activity', [DevSupportController::class, 'ticketActivity']);
    Route::patch('/devsupport/tickets/{ticket}/assign', [DevSupportController::class, 'assignTicket']);
    Route::patch('/devsupport/tickets/{ticket}', [DevSupportController::class, 'updateTicket']);
    Route::post('/devsupport/tickets', [DevSupportController::class, 'storeTicket']);
});
