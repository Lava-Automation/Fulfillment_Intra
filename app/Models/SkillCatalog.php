<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// public.skills_catalog — the directory of skills that can be granted to VAs
// (training-only). UUID string PK (skill_id), columns category + name.
class SkillCatalog extends Model
{
    protected $table = 'skills_catalog';
    protected $primaryKey = 'skill_id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;
    protected $guarded = [];
}
