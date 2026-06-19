<?php

namespace App\Providers;

use App\Support\ActivityLogger;
use App\Support\CurrentEmployee;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Resolve the current employee once per request (it queries the
        // employees view), and share that instance with the ActivityLogger.
        $this->app->scoped(CurrentEmployee::class);
        $this->app->scoped(ActivityLogger::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
