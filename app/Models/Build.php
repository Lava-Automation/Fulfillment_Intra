<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Build extends Model
{
    protected $table = 'builds';
    protected $primaryKey = 'build_id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = true;
    protected $guarded = [];

    protected $casts = [
        'qa_reviewer_ids' => 'array',
    ];
}
