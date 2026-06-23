<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// public.option_set — the single universal pool every dropdown in the hub reads
// from. One row per (category, value). Account columns store the value as TEXT;
// the API validates against the active values for the category. Retire a value
// by setting is_active = false (never delete) so historical rows stay valid.
class OptionSet extends Model
{
    protected $table = 'option_set';
    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;
    protected $guarded = [];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    // The active values for one category, in sort order. Used both to populate
    // dropdowns and to validate incoming writes against the allowed set.
    public static function activeValues(string $category): array
    {
        return static::where('category', $category)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('value')
            ->pluck('value')
            ->all();
    }
}
