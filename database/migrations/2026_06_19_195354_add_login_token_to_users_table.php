<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Stores the hash of the current magic-link's one-time token. Set when a link is
// emailed, consumed (set back to null) on the first successful verify, so a link
// can be used only once. Requesting a new link overwrites it, invalidating any
// older outstanding link.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('login_token')->nullable()->after('remember_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('login_token');
        });
    }
};
