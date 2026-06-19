<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActionItem extends Model
{
    protected $table = 'action_items';
    protected $primaryKey = 'action_item_id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = true;
    protected $guarded = [];
}
