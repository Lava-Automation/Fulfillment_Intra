<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Employee;
use Illuminate\Http\Request;

// The hub's two log surfaces, both read-only:
//   - activity(): IN-APP changes — the spine.activity_log audit trail every
//     controller writes (who changed what value, when).
//   - dev(): FEATURE / CODE changes — a curated changelog (database/dev-log.json)
//     where each code/feature change is recorded with the reasoning behind it.
class LogController extends Controller
{
    // GET /api/activity-log — recent audit-trail entries, newest first.
    public function activity(Request $request)
    {
        $rows = ActivityLog::orderByDesc('created_at')
            ->limit(300)
            ->get(['id', 'app', 'actor_id', 'actor_email', 'action', 'entity_type', 'entity_id', 'details', 'created_at']);

        $ids = $rows->pluck('actor_id')->filter()->unique()->values();
        $names = $ids->isEmpty()
            ? collect()
            : Employee::whereIn('id', $ids)->pluck('name', 'id');

        return response()->json([
            'apps' => $rows->pluck('app')->filter()->unique()->values(),
            'entries' => $rows->map(fn ($r) => [
                'id' => $r->id,
                'app' => $r->app,
                'action' => $r->action,
                'entity_type' => $r->entity_type,
                'entity_id' => $r->entity_id,
                'details' => $r->details,
                'created_at' => $r->created_at,
                'actor' => $names[$r->actor_id] ?? $r->actor_email ?? 'system',
            ]),
        ]);
    }

    // GET /api/dev-log — the curated feature/code changelog (with reasons).
    public function dev()
    {
        $path = base_path('database/dev-log.json');
        $entries = [];
        if (is_file($path)) {
            $entries = json_decode((string) file_get_contents($path), true) ?: [];
        }

        // Newest first if entries carry a date.
        usort($entries, fn ($a, $b) => strcmp($b['date'] ?? '', $a['date'] ?? ''));

        return response()->json(['entries' => $entries]);
    }
}
