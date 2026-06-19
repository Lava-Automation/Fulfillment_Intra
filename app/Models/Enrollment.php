<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// public.enrollments — a VA enrolled on a course (training-only table). UUID
// string PK; has created_at + updated_at (verified), so timestamps are managed.
class Enrollment extends Model
{
    protected $table = 'enrollments';
    protected $primaryKey = 'enrollment_id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = true;
    protected $guarded = [];

    protected $casts = [
        'completed' => 'boolean',
    ];
}
