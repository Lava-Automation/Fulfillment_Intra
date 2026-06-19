<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Goal extends Model
{
    protected $table = 'goals';
    protected $primaryKey = 'goal_id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = true;
    protected $guarded = [];
}
