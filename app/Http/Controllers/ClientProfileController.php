<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\AccountTeam;
use App\Models\ActionItem;
use App\Models\Employee;
use App\Models\Goal;
use App\Models\HubspotCompany;
use App\Models\Meeting;
use App\Models\Project;
use App\Models\TimelineEvent;
use App\Models\Va;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;

// Client Profile (Company 360) — data layer moved off browser-direct Supabase
// into Laravel. The React app (apps/clientProfile/index.jsx) fetches these JSON
// endpoints instead of querying Supabase, and the activity_log writes happen
// here. App key stays 'clientprofile' and action names mirror the original file.
class ClientProfileController extends Controller
{
    public function __construct(private ActivityLogger $activity)
    {
    }

    // Accounts list: accounts + employee names + hubspot company names.
    public function index()
    {
        $accounts = Account::get([
            'account_id', 'plan', 'stage', 'cs_status', 'fulfillment', 'pm_id', 'hubspot_company_id',
        ]);

        $employees = Employee::get(['id', 'name']);

        $companyIds = $accounts->pluck('hubspot_company_id')->filter()->unique()->values();
        $companies = $companyIds->isEmpty()
            ? collect()
            : HubspotCompany::whereIn('id', $companyIds)->get(['id', 'name']);

        return response()->json([
            'accounts' => $accounts,
            'employees' => $employees,
            'companies' => $companies,
        ]);
    }

    // One account's full 360 profile.
    public function show(string $account)
    {
        $acct = Account::findOrFail($account);

        $company = $acct->hubspot_company_id
            ? HubspotCompany::where('id', $acct->hubspot_company_id)->first(['name'])
            : null;

        return response()->json([
            'account' => $acct->only([
                'account_id', 'plan', 'crm', 'ams', 'stage', 'service_status', 'fulfillment',
                'cs_status', 'pm_id', 'since_date', 'cancel_date', 'hubspot_company_id',
                'va_start_date', 'go_live_date', 'support_through', 'decision_due_date',
                'ad_hoc_prepaid', 'tech_tools',
            ]),
            'company' => $company,
            'employees' => Employee::get(['id', 'name']),
            'vas' => Va::get(['employee_id', 'account_id', 'title', 'status']),
            'meetings' => Meeting::where('account_id', $account)
                ->orderByDesc('meeting_date')
                ->get(['meeting_id', 'type', 'title', 'status', 'meeting_date', 'rating', 'notes']),
            'goals' => Goal::where('account_id', $account)
                ->get(['goal_id', 'title', 'status', 'quarter', 'owner_id']),
            'projects' => Project::where('account_id', $account)
                ->get(['project_id', 'name', 'status', 'progress_pct']),
            'action_items' => ActionItem::where('account_id', $account)
                ->orderBy('due_date')
                ->get(['action_item_id', 'body', 'owner_id', 'due_date', 'status']),
            'timeline_events' => TimelineEvent::where('account_id', $account)
                ->orderByDesc('event_date')
                ->get(['timeline_event_id', 'event_date', 'label', 'detail', 'color']),
            'account_team' => AccountTeam::where('account_id', $account)
                ->get(['employee_id', 'role_group']),
        ]);
    }

    // Assign a VA to this account (vas.account_id = account).
    public function assignVa(Request $request, string $account)
    {
        Account::findOrFail($account);

        $data = $request->validate([
            'employee_id' => 'required|uuid',
        ]);

        Va::whereKey($data['employee_id'])->update(['account_id' => $account]);

        $this->activity->log('clientprofile', 'clientprofile.va.assigned', 'account', $account, [
            'va' => Employee::whereKey($data['employee_id'])->value('name'),
        ]);

        return response()->json(['ok' => true]);
    }

    // Remove a VA from this account (vas.account_id = null).
    public function removeVa(Request $request, string $account)
    {
        Account::findOrFail($account);

        $data = $request->validate([
            'employee_id' => 'required|uuid',
        ]);

        Va::whereKey($data['employee_id'])->update(['account_id' => null]);

        $this->activity->log('clientprofile', 'clientprofile.va.removed', 'account', $account, [
            'va' => Employee::whereKey($data['employee_id'])->value('name'),
        ]);

        return response()->json(['ok' => true]);
    }

    // Add a person to the Lava account team for a role group.
    public function assignTeam(Request $request, string $account)
    {
        Account::findOrFail($account);

        $data = $request->validate([
            'employee_id' => 'required|uuid',
            'role_group' => 'required|string',
        ]);

        AccountTeam::insert([
            'account_id' => $account,
            'employee_id' => $data['employee_id'],
            'role_group' => $data['role_group'],
        ]);

        $this->activity->log('clientprofile', 'clientprofile.team.assigned', 'account', $account, [
            'person' => Employee::whereKey($data['employee_id'])->value('name'),
            'group' => $data['role_group'],
        ]);

        return response()->json(['ok' => true]);
    }

    // Remove a person from the Lava account team for a role group.
    public function removeTeam(Request $request, string $account)
    {
        Account::findOrFail($account);

        $data = $request->validate([
            'employee_id' => 'required|uuid',
            'role_group' => 'required|string',
        ]);

        AccountTeam::where('account_id', $account)
            ->where('employee_id', $data['employee_id'])
            ->where('role_group', $data['role_group'])
            ->delete();

        $this->activity->log('clientprofile', 'clientprofile.team.removed', 'account', $account, [
            'person' => Employee::whereKey($data['employee_id'])->value('name'),
            'group' => $data['role_group'],
        ]);

        return response()->json(['ok' => true]);
    }

    // Per-account tech tools selection saved to accounts.tech_tools.
    public function updateTechTools(Request $request, string $account)
    {
        $acct = Account::findOrFail($account);

        $data = $request->validate([
            'tech_tools' => 'present|array',
            'tech_tools.*' => 'string',
        ]);

        $acct->update(['tech_tools' => $data['tech_tools']]);

        $this->activity->log('clientprofile', 'clientprofile.techtools.updated', 'account', $account, [
            'tools' => $data['tech_tools'],
        ]);

        return response()->json(['ok' => true]);
    }
}
