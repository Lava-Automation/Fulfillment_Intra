<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// public.training_sessions — UUID string PK (DB default gen_random_uuid()),
// has created_at + updated_at.
class TrainingSession extends Model
{
    protected $table = 'training_sessions';
    protected $primaryKey = 'training_session_id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = true;
    protected $guarded = [];

    protected $casts = [
        'scheduled_at' => 'datetime',
    ];
}
