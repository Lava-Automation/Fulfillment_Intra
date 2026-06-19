<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// public.activity_log is an INSERTABLE view over spine.activity_log; the spine
// base table supplies id (gen_random_uuid()) and created_at (now()) defaults, so
// inserts need only the business columns. Append-only — no updates/deletes.
class ActivityLog extends Model
{
    protected $table = 'activity_log';
    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'app', 'actor_id', 'actor_email', 'action', 'entity_type', 'entity_id', 'details',
    ];

    protected $casts = [
        'details' => 'array', // jsonb
    ];
}
