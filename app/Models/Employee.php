<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Read-only Eloquent model over the public.employees VIEW (which selects from
// spine.employees). UUID string PK, no updated_at. Writes are blocked — the
// view is for reads only.
class Employee extends Model
{
    protected $table = 'employees';
    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;
    protected $guarded = [];

    protected static function booted(): void
    {
        static::saving(fn () => throw new \RuntimeException('Employee view is read-only.'));
        static::deleting(fn () => throw new \RuntimeException('Employee view is read-only.'));
    }
}
