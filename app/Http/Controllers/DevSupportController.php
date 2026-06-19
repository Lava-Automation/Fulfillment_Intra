<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\ActivityLog;
use App\Models\Employee;
use App\Models\HubspotCompany;
use App\Models\Ticket;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;

// Dev Support Queue — data layer moved off browser-direct Supabase into Laravel.
// The React app (apps/devSupport/index.jsx) fetches these JSON endpoints instead
// of querying Supabase, and the activity_log writes happen here. The app key
// 'devsupport' is preserved from the original logActivity calls.
class DevSupportController extends Controller
{
    public function __construct(private ActivityLogger $activity)
    {
    }

    public function index()
    {
        $tickets = Ticket::orderByDesc('created_at')
            ->get(['ticket_id', 'account_id', 'title', 'description', 'priority', 'status', 'assigned_to', 'created_at', 'resolved_at']);

        $accounts = Account::get(['account_id', 'hubspot_company_id']);

        $employees = Employee::get(['id', 'name', 'position']);

        $companyIds = $accounts->pluck('hubspot_company_id')->filter()->unique()->values();
        $companies = $companyIds->isEmpty()
            ? collect()
            : HubspotCompany::whereIn('id', $companyIds)->get(['id', 'name']);

        return response()->json([
            'tickets' => $tickets,
            'accounts' => $accounts,
            'employees' => $employees,
            'companies' => $companies,
        ]);
    }

    // The DetailDrawer's Activity feed: the same activity_log filter the drawer
    // ran in the browser (app=devsupport, entity_type=ticket, entity_id=<id>),
    // newest first, returning the columns the drawer renders.
    public function ticketActivity(string $ticket)
    {
        $rows = ActivityLog::where('app', 'devsupport')
            ->where('entity_type', 'ticket')
            ->where('entity_id', (string) $ticket)
            ->orderByDesc('created_at')
            ->get(['action', 'actor_email', 'details', 'created_at']);

        return response()->json($rows);
    }

    public function assignTicket(Request $request, string $ticket)
    {
        $data = $request->validate([
            'assigned_to' => 'required|uuid',
        ]);

        $model = Ticket::findOrFail($ticket);
        $model->update(['assigned_to' => $data['assigned_to']]);

        $this->activity->log('devsupport', 'devsupport.ticket.assigned', 'ticket', $model->ticket_id, [
            'to' => Employee::whereKey($data['assigned_to'])->value('name') ?? $data['assigned_to'],
        ]);

        return response()->json(['ok' => true]);
    }

    public function updateTicket(Request $request, string $ticket)
    {
        $data = $request->validate([
            'status' => 'required|in:open,in_progress,waiting,resolved',
        ]);

        $model = Ticket::findOrFail($ticket);
        $from = $model->status;

        $patch = ['status' => $data['status']];
        if ($data['status'] === 'resolved') {
            $patch['resolved_at'] = now();
        }
        $model->update($patch);

        $this->activity->log(
            'devsupport',
            $data['status'] === 'resolved' ? 'devsupport.ticket.resolved' : 'devsupport.ticket.status_changed',
            'ticket',
            $model->ticket_id,
            ['from' => $from, 'to' => $data['status']],
        );

        return response()->json(['ok' => true]);
    }

    public function storeTicket(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string',
            'description' => 'nullable|string',
            'account_id' => 'nullable|uuid',
            'priority' => 'required|in:H,M,L',
            'assigned_to' => 'nullable|uuid',
        ]);

        $ticket = Ticket::create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'account_id' => $data['account_id'] ?? null,
            'priority' => $data['priority'],
            'status' => 'open',
            'assigned_to' => $data['assigned_to'] ?? null,
        ]);

        $this->activity->log('devsupport', 'devsupport.ticket.opened', 'ticket', $ticket->ticket_id, [
            'title' => $data['title'],
            'priority' => $data['priority'],
        ]);

        return response()->json(['ok' => true]);
    }
}
