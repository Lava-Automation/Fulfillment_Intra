<?php

use App\Http\Controllers\TrainingController;
use Illuminate\Support\Facades\Route;

// JSON data endpoints for the Training Tracker SPA app (session-authenticated,
// same origin, CSRF-protected). Replaces browser-direct Supabase queries.
Route::middleware('auth')->prefix('api')->group(function () {
    // Reads
    Route::get('/training/catalog', [TrainingController::class, 'catalog']);
    Route::get('/training/va-roster', [TrainingController::class, 'vaRoster']);
    Route::get('/training/skills-catalog', [TrainingController::class, 'skillsCatalog']);
    Route::get('/training/track', [TrainingController::class, 'track']);
    Route::get('/training/dashboard', [TrainingController::class, 'dashboard']);
    Route::get('/training/reports', [TrainingController::class, 'reports']);

    // Courses
    Route::post('/training/courses', [TrainingController::class, 'storeCourse']);
    Route::patch('/training/courses/{course}', [TrainingController::class, 'updateCourse']);
    Route::delete('/training/courses/{course}', [TrainingController::class, 'destroyCourse']);

    // Modules
    Route::post('/training/modules', [TrainingController::class, 'storeModule']);
    Route::patch('/training/modules/{module}', [TrainingController::class, 'updateModule']);
    Route::delete('/training/modules/{module}', [TrainingController::class, 'destroyModule']);

    // Lessons
    Route::post('/training/lessons', [TrainingController::class, 'storeLesson']);
    Route::patch('/training/lessons/{lesson}', [TrainingController::class, 'updateLesson']);
    Route::delete('/training/lessons/{lesson}', [TrainingController::class, 'destroyLesson']);

    // VA skills
    Route::patch('/training/vas/{va}/skills', [TrainingController::class, 'updateVaSkills']);

    // Enrollments + module progress
    Route::post('/training/enrollments', [TrainingController::class, 'storeEnrollment']);
    Route::delete('/training/enrollments/{enrollment}', [TrainingController::class, 'destroyEnrollment']);
    Route::patch('/training/enrollments/{enrollment}/module-progress', [TrainingController::class, 'updateModuleProgress']);

    // Skills catalog (Settings)
    Route::post('/training/skills', [TrainingController::class, 'storeSkill']);
    Route::delete('/training/skills/{skill}', [TrainingController::class, 'destroySkill']);
});
