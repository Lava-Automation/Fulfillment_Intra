<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// public.vas — the VA roster. PK is employee_id (UUID), has created_at +
// updated_at. skills/issues are Postgres arrays (not cast here; not needed for
// the trainer-workload slice, which only toggles `certified`).
class Va extends Model
{
    protected $table = 'vas';
    protected $primaryKey = 'employee_id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = true;
    protected $guarded = [];

    protected $casts = [
        'certified' => 'boolean',
    ];
}
