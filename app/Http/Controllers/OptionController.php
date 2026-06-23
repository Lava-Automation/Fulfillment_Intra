<?php

namespace App\Http\Controllers;

use App\Models\OptionSet;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

// Universal option pool (public.option_set). Every dropdown across the hub reads
// from here so values stay consistent system-wide, and the choices are data the
// team can edit instead of hardcoded arrays. Read is open to any signed-in user;
// the CRUD writes are the admin "manage dropdown values" surface.
class OptionController extends Controller
{
    // The seven categories the hub manages today. Writes are constrained to
    // these so a typo in `category` can't silently create an orphan pool.
    private const CATEGORIES = [
        'plan', 'fulfillment_status', 'account_status', 'cs_status', 'crm', 'ams', 'form_software',
    ];

    public function __construct(private ActivityLogger $activity)
    {
    }

    // All active options grouped by category — one fetch the SPA caches and every
    // app's dropdowns read from. GET /api/options
    public function index()
    {
        $grouped = OptionSet::where('is_active', true)
            ->orderBy('category')
            ->orderBy('sort_order')
            ->orderBy('value')
            ->get(['category', 'value', 'label'])
            ->groupBy('category')
            ->map(fn ($rows) => $rows->map(fn ($r) => [
                'value' => $r->value,
                'label' => $r->label ?? $r->value,
            ])->values());

        return response()->json(['options' => $grouped]);
    }

    // The full pool for one category INCLUDING inactive rows — for the admin
    // manage screen. GET /api/options/{category}
    public function show(string $category)
    {
        abort_unless(in_array($category, self::CATEGORIES, true), 404);

        return response()->json([
            'category' => $category,
            'options' => OptionSet::where('category', $category)
                ->orderBy('sort_order')
                ->orderBy('value')
                ->get(['id', 'value', 'label', 'sort_order', 'is_active']),
        ]);
    }

    // Add a value to a category. POST /api/options
    public function store(Request $request)
    {
        $data = $request->validate([
            'category' => ['required', 'string', Rule::in(self::CATEGORIES)],
            'value' => 'required|string|max:120',
            'label' => 'nullable|string|max:120',
            'sort_order' => 'nullable|integer',
        ]);

        $row = OptionSet::firstOrCreate(
            ['category' => $data['category'], 'value' => trim($data['value'])],
            [
                'label' => $data['label'] ?? null,
                'sort_order' => $data['sort_order'] ?? 0,
                'is_active' => true,
            ],
        );

        // If it already existed but was retired, bringing it back is the intent.
        if (! $row->wasRecentlyCreated && ! $row->is_active) {
            $row->update(['is_active' => true]);
        }

        $this->activity->log('options', 'options.value.added', 'option_set', $row->id, [
            'category' => $row->category,
            'value' => $row->value,
        ]);

        return response()->json(['ok' => true, 'option' => $row]);
    }

    // Edit a value's label / order / active flag. PATCH /api/options/{option}
    public function update(Request $request, string $option)
    {
        $row = OptionSet::findOrFail($option);

        $data = $request->validate([
            'label' => 'sometimes|nullable|string|max:120',
            'sort_order' => 'sometimes|integer',
            'is_active' => 'sometimes|boolean',
        ]);

        $row->update($data);

        $this->activity->log('options', 'options.value.updated', 'option_set', $row->id, [
            'category' => $row->category,
            'value' => $row->value,
            'changes' => array_keys($data),
        ]);

        return response()->json(['ok' => true, 'option' => $row]);
    }

    // Retire a value (deactivate, never hard-delete). DELETE /api/options/{option}
    public function destroy(string $option)
    {
        $row = OptionSet::findOrFail($option);
        $row->update(['is_active' => false]);

        $this->activity->log('options', 'options.value.retired', 'option_set', $row->id, [
            'category' => $row->category,
            'value' => $row->value,
        ]);

        return response()->json(['ok' => true]);
    }
}
