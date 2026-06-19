<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Build;
use App\Models\Employee;
use App\Models\HubspotCompany;
use App\Models\Va;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;

// QAQC Build Review Tracker — data layer moved off browser-direct Supabase into
// Laravel. The React app (apps/qaqc/index.jsx) fetches these JSON endpoints
// instead of querying Supabase, and the activity_log writes happen here under
// the legacy "qa" app key. Builds carry single-uuid FKs plus a qa_reviewer_ids
// uuid[] for multiple reviewers; the agency name is the linked account's hubspot
// company name, joined server-side here so the browser never touches that table.
class QaqcController extends Controller
{
    public function __construct(private ActivityLogger $activity)
    {
    }

    public function index()
    {
        $builds = Build::orderByDesc('date_start')->get([
            'build_id', 'account_id', 'va_id', 'qa_reviewer_id', 'qa_reviewer_ids',
            'pm_id', 'crm', 'status', 'issues', 'date_start', 'date_finish',
            'checklist_url', 'pending_url', 'im_link', 'client_name', 'on_time_override',
        ]);

        $accounts = Account::get(['account_id', 'hubspot_company_id', 'pm_id']);

        // Resolve agency names from the linked hubspot companies (server-side join).
        $companyIds = $accounts->pluck('hubspot_company_id')->filter()->unique()->values();
        $companyName = $companyIds->isNotEmpty()
            ? HubspotCompany::whereIn('id', $companyIds)->pluck('name', 'id')
            : collect();

        $accountsOut = $accounts->map(fn ($a) => [
            'account_id' => $a->account_id,
            'hubspot_company_id' => $a->hubspot_company_id,
            'pm_id' => $a->pm_id,
            'agency' => $companyName[$a->hubspot_company_id] ?? '(no agency)',
        ]);

        return response()->json([
            'builds' => $builds,
            'accounts' => $accountsOut,
            'employees' => Employee::orderBy('name')->get(['id', 'name', 'position']),
            'vaIds' => Va::pluck('employee_id'),
        ]);
    }

    // Inline status change from the table row. Auto-stamps date_finish on Done.
    public function updateStatus(Request $request, string $build)
    {
        $model = Build::findOrFail($build);

        $data = $request->validate([
            'status' => 'required|in:Done,Working On It,Waiting on Client,Pending',
        ]);

        $patch = ['status' => $data['status']];
        if ($data['status'] === 'Done' && ! $model->date_finish) {
            $patch['date_finish'] = now()->toDateString();
        }

        $model->update($patch);

        $this->activity->log('qa', 'qa.build.status_changed', 'build', $model->build_id, [
            'to' => $data['status'],
        ]);

        return response()->json(['ok' => true]);
    }

    // Inline single-field edit from the table row (CRM, PM, On Time).
    public function updateField(Request $request, string $build)
    {
        $model = Build::findOrFail($build);

        $data = $request->validate([
            'field' => 'required|in:crm,project_mgr,on_time_override',
            'value' => 'nullable|string',
        ]);

        $colMap = ['crm' => 'crm', 'project_mgr' => 'pm_id', 'on_time_override' => 'on_time_override'];
        $col = $colMap[$data['field']];
        $value = $data['value'] ?? null;

        if ($data['field'] === 'project_mgr') {
            $value = $value !== null && $value !== '' && Employee::whereKey($value)->exists() ? $value : null;
        }
        if ($data['field'] === 'on_time_override' && ($value === '' )) {
            $value = null;
        }

        $model->update([$col => $value]);

        $this->activity->log('qa', 'qa.build.field_changed', 'build', $model->build_id, [
            'field' => $data['field'],
            'to' => $request->input('label', $value),
        ]);

        return response()->json(['ok' => true]);
    }

    // QA reviewers are multi-valued. Write the full uuid[] and keep the legacy
    // qa_reviewer_id in sync (= first reviewer) so single-column reads still work.
    public function updateReviewers(Request $request, string $build)
    {
        $model = Build::findOrFail($build);

        $data = $request->validate([
            'qa_ids' => 'present|array',
            'qa_ids.*' => 'uuid',
        ]);

        $ids = array_values($data['qa_ids']);
        $model->update([
            'qa_reviewer_ids' => $ids,
            'qa_reviewer_id' => $ids[0] ?? null,
        ]);

        $names = Employee::whereIn('id', $ids)->pluck('name')->all();
        $this->activity->log('qa', 'qa.build.field_changed', 'build', $model->build_id, [
            'field' => 'qa_reviewers',
            'to' => $names,
        ]);

        return response()->json(['ok' => true]);
    }

    // Full save from the drawer — every editable field at once.
    public function updateBuild(Request $request, string $build)
    {
        $model = Build::findOrFail($build);

        $data = $request->validate([
            'client_name' => 'nullable|string',
            'crm' => 'nullable|string',
            'pm_id' => 'nullable|uuid',
            'qa_ids' => 'present|array',
            'qa_ids.*' => 'uuid',
            'va_id' => 'nullable|uuid',
            'issues' => 'nullable|string',
            'status' => 'required|in:Done,Working On It,Waiting on Client,Pending',
            'date_start' => 'nullable|date',
            'date_finish' => 'nullable|date',
            'checklist_url' => 'nullable|string',
            'pending_url' => 'nullable|string',
            'im_link' => 'nullable|string',
            'on_time_override' => 'nullable|string',
            'agency' => 'nullable|string',
        ]);

        $ids = array_values($data['qa_ids']);
        $patch = [
            'client_name' => $data['client_name'] ?? null,
            'crm' => $data['crm'] ?? null,
            'pm_id' => $data['pm_id'] ?? null,
            'qa_reviewer_ids' => $ids,
            'qa_reviewer_id' => $ids[0] ?? null,
            'va_id' => $data['va_id'] ?? null,
            'issues' => $data['issues'] ?? null,
            'status' => $data['status'],
            'date_start' => $data['date_start'] ?? null,
            'date_finish' => $data['date_finish'] ?? null,
            'checklist_url' => $data['checklist_url'] ?? null,
            'pending_url' => $data['pending_url'] ?? null,
            'im_link' => $data['im_link'] ?? null,
            'on_time_override' => $data['on_time_override'] ?? null,
        ];
        if ($patch['status'] === 'Done' && ! $patch['date_finish']) {
            $patch['date_finish'] = now()->toDateString();
        }

        $model->update($patch);

        $this->activity->log('qa', 'qa.build.updated', 'build', $model->build_id, [
            'agency' => $data['agency'] ?? null,
        ]);

        return response()->json(['ok' => true]);
    }

    // New build — carries real foreign keys picked from records.
    public function storeBuild(Request $request)
    {
        $data = $request->validate([
            'account_id' => 'nullable|uuid',
            'va_id' => 'nullable|uuid',
            'qa_ids' => 'present|array',
            'qa_ids.*' => 'uuid',
            'pm_id' => 'nullable|uuid',
            'crm' => 'nullable|string',
            'status' => 'required|in:Done,Working On It,Waiting on Client,Pending',
            'client_name' => 'nullable|string',
            'date_start' => 'nullable|date',
            'agency' => 'nullable|string',
            'va_name' => 'nullable|string',
            'pm_name' => 'nullable|string',
        ]);

        $ids = array_values($data['qa_ids']);
        $created = Build::create([
            'account_id' => $data['account_id'] ?? null,
            'va_id' => $data['va_id'] ?? null,
            'qa_reviewer_ids' => $ids,
            'qa_reviewer_id' => $ids[0] ?? null,
            'pm_id' => $data['pm_id'] ?? null,
            'crm' => $data['crm'] ?? null,
            'status' => $data['status'],
            'client_name' => $data['client_name'] ?? null,
            'issues' => '',
            'date_start' => $data['date_start'] ?? null,
        ]);

        $this->activity->log('qa', 'qa.build.logged', 'build', $created->build_id, [
            'agency' => $data['agency'] ?? null,
            'va' => $data['va_name'] ?? null,
            'pm' => $data['pm_name'] ?? null,
        ]);

        return response()->json(['ok' => true, 'build_id' => $created->build_id]);
    }
}
