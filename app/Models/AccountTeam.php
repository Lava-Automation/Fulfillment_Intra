<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// account_team has a composite PK (account_id, employee_id, role_group) and only
// created_at. Eloquent doesn't model composite keys well, so writes are done via
// the query builder (insert / where()->delete()); reads are fine.
class AccountTeam extends Model
{
    protected $table = 'account_team';
    protected $primaryKey = 'account_id';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;
    protected $guarded = [];
}
