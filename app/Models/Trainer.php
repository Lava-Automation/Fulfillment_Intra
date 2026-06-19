<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Trainer extends Model
{
    protected $table = 'trainers';
    protected $primaryKey = 'employee_id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = true;
    protected $guarded = [];

    protected $casts = [
        'capacity' => 'integer',
    ];
}
