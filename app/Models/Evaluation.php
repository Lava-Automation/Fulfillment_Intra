<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// public.evaluations — UUID string PK, has created_at + updated_at.
class Evaluation extends Model
{
    protected $table = 'evaluations';
    protected $primaryKey = 'evaluation_id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = true;
    protected $guarded = [];

    protected $casts = [
        'rating' => 'integer',
        'endorsed' => 'boolean',
    ];
}
