<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Evaluation;
use App\Models\TrainingSession;
use App\Models\Va;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;

// Trainer Workload — data layer moved off browser-direct Supabase into Laravel.
// The React app (apps/trainerWorkload/index.jsx) fetches these JSON endpoints
// instead of querying Supabase, and the activity_log writes happen here.
class TrainerWorkloadController extends Controller
{
    public function __construct(private ActivityLogger $activity)
    {
    }

    public function index()
    {
        return response()->json([
            'sessions' => TrainingSession::orderBy('scheduled_at')
                ->get(['training_session_id', 'va_id', 'trainer_id', 'scheduled_at', 'track', 'status']),
            'employees' => Employee::orderBy('name')
                ->get(['id', 'name', 'position', 'department']),
            'vaIds' => Va::pluck('employee_id'),
            'evaluations' => Evaluation::orderByDesc('created_at')
                ->get(['evaluation_id', 'va_id', 'trainer_id', 'rating', 'note', 'endorsed', 'created_at']),
        ]);
    }

    public function storeSession(Request $request)
    {
        $data = $request->validate([
            'va_id' => 'required|uuid',
            'trainer_id' => 'required|uuid',
            'scheduled_at' => 'required|date',
            'track' => 'required|string',
        ]);

        TrainingSession::create($data + ['status' => 'scheduled']);

        $this->activity->log('training', 'training.session.scheduled', 'training_session', $data['va_id'], [
            'trainer' => Employee::whereKey($data['trainer_id'])->value('name'),
            'track' => $data['track'],
        ]);

        return response()->json(['ok' => true]);
    }

    public function updateSession(Request $request, string $session)
    {
        $model = TrainingSession::findOrFail($session);

        $data = $request->validate([
            'trainer_id' => 'sometimes|uuid',
            'status' => 'sometimes|in:scheduled,live,completed,no_show,canceled',
        ]);

        $model->update($data);

        if (isset($data['trainer_id'])) {
            $this->activity->log('training', 'training.trainer.reassigned', 'training_session', $model->training_session_id, [
                'to' => Employee::whereKey($data['trainer_id'])->value('name'),
            ]);
        }
        if (isset($data['status'])) {
            $this->activity->log('training', 'training.session.status', 'training_session', $model->training_session_id, [
                'status' => $data['status'],
            ]);
        }

        return response()->json(['ok' => true]);
    }

    public function destroySession(string $session)
    {
        $model = TrainingSession::findOrFail($session);
        $id = $model->training_session_id;
        $model->delete();

        $this->activity->log('training', 'training.session.removed', 'training_session', $id, []);

        return response()->json(['ok' => true]);
    }

    public function storeEvaluation(Request $request)
    {
        $data = $request->validate([
            'va_id' => 'required|uuid',
            'trainer_id' => 'required|uuid',
            'rating' => 'required|integer|min:1|max:5',
            'note' => 'nullable|string',
            'endorsed' => 'boolean',
        ]);

        Evaluation::create([
            'va_id' => $data['va_id'],
            'trainer_id' => $data['trainer_id'],
            'rating' => $data['rating'],
            'note' => $data['note'] ?? null,
            'endorsed' => $data['endorsed'] ?? false,
        ]);

        $this->activity->log('training', 'training.session.evaluated', 'evaluation', $data['va_id'], [
            'rating' => $data['rating'],
            'endorsed' => (bool) ($data['endorsed'] ?? false),
        ]);

        if (! empty($data['endorsed'])) {
            Va::whereKey($data['va_id'])->update(['certified' => true]);
            $this->activity->log('training', 'training.va.endorsed', 'va', $data['va_id'], [
                'by' => Employee::whereKey($data['trainer_id'])->value('name'),
            ]);
        }

        return response()->json(['ok' => true]);
    }
}
