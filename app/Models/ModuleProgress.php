<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// public.module_progress — per-(enrollment, module) progress (training-only).
// UUID string PK; has created_at + updated_at (verified), so timestamps managed.
class ModuleProgress extends Model
{
    protected $table = 'module_progress';
    protected $primaryKey = 'module_progress_id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = true;
    protected $guarded = [];

    protected $casts = [
        'pct' => 'integer',
        'quiz_done' => 'integer',
        'quiz_total' => 'integer',
    ];
}
