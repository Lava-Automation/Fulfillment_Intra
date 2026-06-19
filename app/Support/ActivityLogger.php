<?php

namespace App\Support;

use App\Models\ActivityLog;

// The append-only audit write — the server replacement for resources/js/lib/
// activity.js. Every meaningful state change in a controller calls log(). The
// actor is always taken from CurrentEmployee (never request input) so the audit
// trail can't be spoofed. action is namespaced <app>.<entity>.<verb>.
class ActivityLogger
{
    public function __construct(private CurrentEmployee $current)
    {
    }

    public function log(
        string $app,
        string $action,
        ?string $entityType = null,
        $entityId = null,
        ?array $details = null,
    ): void {
        try {
            ActivityLog::create([
                'app' => $app,
                'actor_id' => $this->current->id(),
                'actor_email' => $this->current->email(),
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId !== null ? (string) $entityId : null,
                'details' => $details,
            ]);
        } catch (\Throwable $e) {
            report($e); // logging must never break the request
        }
    }
}
