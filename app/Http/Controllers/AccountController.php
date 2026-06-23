<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Employee;
use App\Models\HubspotCompany;
use App\Models\OptionSet;
use App\Models\Va;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

// The UNIVERSAL account surface. One account row is the single source of truth
// for the standard company-view fields (plan, statuses, CRM/AMS/forms, the role
// people, address). Every app reads and writes these through this controller, so
// a change made in any app's UI lands on the same row and is reflected
// everywhere. Dropdown fields are validated against the active values in
// public.option_set; people fields against spine.employees.
class AccountController extends Controller
{
    // Account column  =>  option_set category it draws its allowed values from.
    private const OPTION_FIELDS = [
        'plan' => 'plan',
        'fulfillment' => 'fulfillment_status',
        'account_status' => 'account_status',
        'cs_status' => 'cs_status',
        'crm' => 'crm',
        'ams' => 'ams',
        'form_software' => 'form_software',
    ];

    // Single-person role slots on the account (filled from spine.employees).
    // VAs are NOT here — they are multi, via vas.account_id.
    private const PEOPLE_FIELDS = ['pm_id', 'am_id', 'dev_support_id', 'tl_id'];

    // Free-text fields editable on the account.
    private const TEXT_FIELDS = ['owner_name', 'address_street', 'address_zip', 'google_review_link'];

    public function __construct(private ActivityLogger $activity)
    {
    }

    // The universal record for one account: standard fields + resolved people +
    // the company mirror (read-only, HubSpot is the source) + assigned VAs.
    // GET /api/accounts/{account}/universal
    public function universal(string $account)
    {
        $a = Account::findOrFail($account);

        // Company identity mirrors from HubSpot — never edited here.
        $company = $a->hubspot_company_id
            ? HubspotCompany::where('id', $a->hubspot_company_id)
                ->first(['name', 'phone', 'domain', 'city', 'state'])
            : null;

        $peopleIds = collect(self::PEOPLE_FIELDS)->map(fn ($f) => $a->{$f})->filter()->all();
        $names = empty($peopleIds)
            ? []
            : Employee::whereIn('id', $peopleIds)->pluck('name', 'id')->all();

        $people = [];
        foreach (self::PEOPLE_FIELDS as $f) {
            $id = $a->{$f};
            $people[$f] = $id ? ['id' => $id, 'name' => $names[$id] ?? 'Unknown'] : null;
        }

        $vas = Va::where('account_id', $account)
            ->get(['employee_id', 'title', 'status']);
        $vaNames = Employee::whereIn('id', $vas->pluck('employee_id'))->pluck('name', 'id')->all();

        return response()->json([
            'account' => [
                'account_id' => $a->account_id,
                'plan' => $a->plan,
                'fulfillment' => $a->fulfillment,
                'account_status' => $a->account_status,
                'cs_status' => $a->cs_status,
                'crm' => $a->crm,
                'ams' => $a->ams,
                'form_software' => $a->form_software,
                'owner_name' => $a->owner_name,
                'address_street' => $a->address_street,
                'address_zip' => $a->address_zip,
                'google_review_link' => $a->google_review_link,
                'hubspot_company_id' => $a->hubspot_company_id,
            ],
            // City/State/Name/Phone/Website come from HubSpot and supersede edits.
            'company' => $company ? [
                'name' => $company->name,
                'phone' => $company->phone,
                'website' => $company->domain,
                'city' => $company->city,
                'state' => $company->state,
            ] : null,
            'people' => $people,
            'vas' => $vas->map(fn ($v) => [
                'employee_id' => $v->employee_id,
                'name' => $vaNames[$v->employee_id] ?? 'Unknown',
                'title' => $v->title,
                'status' => $v->status,
            ])->values(),
            // Candidate people for the role dropdowns; the UI filters by position.
            'employees' => Employee::orderBy('name')->get(['id', 'name', 'position']),
        ]);
    }

    // Update any subset of the universal fields. Partial patch: only the fields
    // present in the request are touched, so a single-field edit from any app
    // works. PATCH /api/accounts/{account}/universal
    public function updateUniversal(Request $request, string $account)
    {
        $a = Account::findOrFail($account);

        $rules = [];
        // Dropdown fields: must be one of the active option_set values (or blank).
        foreach (self::OPTION_FIELDS as $field => $category) {
            $rules[$field] = ['sometimes', 'nullable', 'string', Rule::in(OptionSet::activeValues($category))];
        }
        // People fields: a real employee, or null to clear the slot.
        foreach (self::PEOPLE_FIELDS as $field) {
            // Validate against the public.employees VIEW (selects from spine).
            $rules[$field] = ['sometimes', 'nullable', 'uuid', Rule::exists('employees', 'id')];
        }
        foreach (self::TEXT_FIELDS as $field) {
            $rules[$field] = ['sometimes', 'nullable', 'string', 'max:500'];
        }

        $data = $request->validate($rules);

        if (empty($data)) {
            return response()->json(['ok' => true, 'changed' => []]);
        }

        $a->update($data);

        $this->activity->log('accounts', 'accounts.universal.updated', 'account', $account, [
            'fields' => array_keys($data),
        ]);

        return response()->json(['ok' => true, 'changed' => array_keys($data)]);
    }
}
