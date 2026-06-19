<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// hubspot_companies has no primary key and is read-only here (looked up by id).
class HubspotCompany extends Model
{
    protected $table = 'hubspot_companies';
    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;
    protected $guarded = [];
}
