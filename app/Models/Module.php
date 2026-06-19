<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Module extends Model
{
    protected $table = 'modules';
    protected $primaryKey = 'module_id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = true;
    protected $guarded = [];

    protected $casts = [
        'position' => 'integer',
    ];
}
