<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\ActivityLog;
use App\Models\Employee;
use App\Models\HubspotCompany;
use App\Models\Meeting;
use App\Models\Note;
use App\Models\Ticket;
use App\Models\TimelineEvent;
use App\Models\Trainer;
use App\Models\TrainingSession;
use App\Models\Va;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;

// Portal (host shell) — data layer moved off browser-direct Supabase into
// Laravel. The React app (apps/portal/index.jsx) fetches these JSON endpoints
// instead of querying Supabase, and the activity_log writes happen here. The
// app key 'portal' and action names are preserved from the original
// logActivity calls. Client-side joins (hubspot company-name maps, employee-
// name maps) are replicated on the server so each endpoint returns the exact
// shape each page already built.
class PortalController extends Controller
{
    public function __construct(private ActivityLogger $activity)
    {
    }

    // ── Root accounts list (App component) ────────────────────────────────
    // Shapes accounts for both the Dashboard and Accounts views. Resolves
    // hubspot company name, PM name, and open-ticket counts server-side.
    public function accounts()
    {
        $accounts = Account::get(['account_id', 'fulfillment', 'cs_status', 'stage', 'since_date', 'hubspot_company_id', 'pm_id']);

        $companyName = $this->companyNames($accounts->pluck('hubspot_company_id'));
        $pmName = $this->employeeNames($accounts->pluck('pm_id'));

        $openByAcct = [];
        foreach (Ticket::get(['account_id', 'status']) as $t) {
            if ($t->status !== 'resolved') {
                $openByAcct[$t->account_id] = ($openByAcct[$t->account_id] ?? 0) + 1;
            }
        }

        $rows = $accounts->map(fn ($a) => [
            'id' => $a->account_id,
            'name' => $companyName[$a->hubspot_company_id] ?? 'Unknown agency',
            'pm' => $pmName[$a->pm_id] ?? '—',
            'fulfillment' => $a->fulfillment ?? '—',
            'csStatus' => $a->cs_status ?? 'New',
            'stage' => $a->stage ?? 'Onboarding',
            'since_date' => $a->since_date,
            'tix' => $openByAcct[$a->account_id] ?? 0,
        ])->values();

        return response()->json(['accounts' => $rows]);
    }

    // ── Dashboard counts + live activity feed ─────────────────────────────
    public function dashboard()
    {
        return response()->json([
            'vaCount' => Va::count(),
            'pendingMeetings' => Meeting::where('status', 'scheduled')->count(),
            'activity' => ActivityLog::orderByDesc('created_at')
                ->limit(6)
                ->get(['app', 'action', 'actor_email', 'created_at']),
        ]);
    }

    // ── Account detail (Overview / Tickets / Meetings / Notes / Timeline) ──
    public function accountDetail(string $account)
    {
        $a = Account::find($account);

        $company = null;
        if ($a && $a->hubspot_company_id) {
            $company = HubspotCompany::where('id', $a->hubspot_company_id)
                ->first(['name', 'phone', 'city', 'state', 'domain']);
        }

        $tickets = Ticket::where('account_id', $account)
            ->orderByDesc('created_at')
            ->get(['ticket_id', 'title', 'priority', 'status', 'created_at', 'resolved_at']);

        $meetings = Meeting::where('account_id', $account)
            ->orderByDesc('meeting_date')
            ->get(['type', 'title', 'status', 'meeting_date', 'scheduled_minutes', 'actual_minutes']);

        $notes = Note::where('account_id', $account)
            ->orderByDesc('created_at')
            ->get(['department', 'author_id', 'body', 'created_at']);

        $timeline = TimelineEvent::where('account_id', $account)
            ->orderByDesc('event_date')
            ->get(['event_date', 'label', 'detail', 'color']);

        $empName = $this->employeeNames($notes->pluck('author_id'));

        return response()->json([
            'account' => $a ? [
                'plan' => $a->plan,
                'crm' => $a->crm,
                'ams' => $a->ams,
                'fulfillment' => $a->fulfillment,
                'cs_status' => $a->cs_status,
                'since_date' => $a->since_date,
                'cancel_date' => $a->cancel_date,
            ] : null,
            'company' => $company,
            'tickets' => $tickets,
            'meetings' => $meetings,
            'notes' => $notes,
            'timeline' => $timeline,
            'employeeNames' => $empName,
        ]);
    }

    // ── Tickets page (board) ──────────────────────────────────────────────
    public function tickets()
    {
        $tickets = Ticket::orderByDesc('created_at')
            ->get(['ticket_id', 'account_id', 'title', 'priority', 'status', 'assigned_to', 'created_at', 'resolved_at']);

        $accounts = Account::get(['account_id', 'pm_id', 'hubspot_company_id']);

        return response()->json([
            'tickets' => $tickets,
            'accounts' => $accounts,
            'employeeNames' => $this->employeeNames(
                $accounts->pluck('pm_id')->merge($tickets->pluck('assigned_to'))
            ),
            'companyNames' => $this->companyNames($accounts->pluck('hubspot_company_id')),
        ]);
    }

    // ── Meetings page ─────────────────────────────────────────────────────
    public function meetings()
    {
        $meetings = Meeting::orderBy('meeting_date')
            ->get(['meeting_id', 'account_id', 'type', 'title', 'status', 'meeting_date', 'meeting_time', 'scheduled_minutes', 'contact', 'notes']);

        $accounts = Account::get(['account_id', 'pm_id', 'hubspot_company_id']);

        return response()->json([
            'meetings' => $meetings,
            'accounts' => $accounts,
            'employeeNames' => $this->employeeNames($accounts->pluck('pm_id')),
            'companyNames' => $this->companyNames($accounts->pluck('hubspot_company_id')),
        ]);
    }

    public function updateMeeting(Request $request, string $meeting)
    {
        $data = $request->validate([
            'status' => 'required|in:confirmed,declined',
        ]);

        $model = Meeting::findOrFail($meeting);
        $model->update(['status' => $data['status']]);

        $this->activity->log('portal', "portal.meeting.{$data['status']}", 'meeting', $model->meeting_id, [
            'title' => $model->title,
        ]);

        return response()->json(['ok' => true]);
    }

    // ── LAVA Trainers page (TrainersContent) ──────────────────────────────
    public function trainers()
    {
        $vas = Va::get(['employee_id', 'account_id', 'title', 'status', 'mods_done', 'mods_total', 'dev_trainer_id', 'ins_trainer_id']);
        $employees = Employee::get(['id', 'name', 'position', 'email']);
        $accounts = Account::get(['account_id', 'hubspot_company_id']);
        $trainers = Trainer::get(['employee_id', 'specialty', 'capacity']);
        $sessions = TrainingSession::get(['trainer_id']);

        return response()->json([
            'vas' => $vas,
            'employees' => $employees,
            'accounts' => $accounts,
            'trainers' => $trainers,
            'sessions' => $sessions,
            'companyNames' => $this->companyNames($accounts->pluck('hubspot_company_id')),
        ]);
    }

    // ── VA Overview page ──────────────────────────────────────────────────
    public function vaOverview()
    {
        $vas = Va::get(['employee_id', 'account_id', 'title', 'status', 'started_at', 'dev_trainer_id', 'ins_trainer_id', 'task_comp', 'tasks_run', 'mods_done', 'mods_total', 'bio', 'skills', 'issues']);
        $accounts = Account::get(['account_id', 'hubspot_company_id']);

        $rows = $vas->map(function ($v) {
            $arr = $v->toArray();
            // vas.skills / vas.issues are native Postgres text[] columns; Eloquent
            // returns them as raw PG array literals. Normalize to real JSON arrays
            // so the page gets the same shape it got from Supabase.
            $arr['skills'] = $this->pgArray($v->skills);
            $arr['issues'] = $this->pgArray($v->issues);

            return $arr;
        });

        return response()->json([
            'vas' => $rows,
            'employees' => Employee::get(['id', 'name', 'position']),
            'accounts' => $accounts,
            'companyNames' => $this->companyNames($accounts->pluck('hubspot_company_id')),
        ]);
    }

    // ── helpers ───────────────────────────────────────────────────────────
    private function employeeNames($ids): array
    {
        $ids = collect($ids)->filter()->unique()->values();
        if ($ids->isEmpty()) {
            return [];
        }

        return Employee::whereIn('id', $ids)->pluck('name', 'id')->all();
    }

    private function companyNames($ids): array
    {
        $ids = collect($ids)->filter()->unique()->values();
        if ($ids->isEmpty()) {
            return [];
        }

        return HubspotCompany::whereIn('id', $ids)->pluck('name', 'id')->all();
    }

    // Convert a Postgres array literal ("{a,b,\"c d\"}") into a PHP array. Pass
    // through if it's already an array (e.g. if the column is jsonb).
    private function pgArray($value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if ($value === null || $value === '' || $value === '{}') {
            return [];
        }
        if (is_string($value) && str_starts_with($value, '{') && str_ends_with($value, '}')) {
            $inner = substr($value, 1, -1);
            if ($inner === '') {
                return [];
            }
            $parts = str_getcsv($inner); // handles quoted elements + commas

            return array_map(fn ($p) => trim($p, '"'), $parts);
        }

        return [];
    }
}
