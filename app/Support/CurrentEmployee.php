<?php

namespace App\Support;

use App\Models\Employee;
use Illuminate\Support\Facades\Auth;

// The single source of "who is the current user" on the server — the Laravel
// replacement for the React useSession hook. Maps the authenticated user (set by
// the magic-link login gate) to a spine.employees row by email, and always
// carries the logged-in email so the UI can show identity even when no employee
// row matches. Resolved once per request.
class CurrentEmployee
{
    private bool $resolved = false;
    private ?array $cache = null;

    public function toArray(): ?array
    {
        if ($this->resolved) {
            return $this->cache;
        }
        $this->resolved = true;

        $user = Auth::user();
        if (! $user) {
            return $this->cache = null;
        }

        $employee = Employee::where('email', $user->email)->first();

        return $this->cache = $employee
            ? [
                'id' => $employee->id,
                'name' => $employee->name,
                'email' => $user->email,
                'country' => $employee->country,
                'group' => $employee->group,
                'department' => $employee->department,
                'position' => $employee->position,
            ]
            : [
                'id' => null,
                'name' => $user->name ?: $user->email,
                'email' => $user->email,
            ];
    }

    public function id(): ?string
    {
        return $this->toArray()['id'] ?? null;
    }

    public function email(): ?string
    {
        return $this->toArray()['email'] ?? null;
    }

    public function name(): ?string
    {
        return $this->toArray()['name'] ?? null;
    }
}
