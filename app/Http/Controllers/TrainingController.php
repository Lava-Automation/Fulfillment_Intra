<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Course;
use App\Models\Employee;
use App\Models\Enrollment;
use App\Models\Evaluation;
use App\Models\HubspotCompany;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\ModuleProgress;
use App\Models\SkillCatalog;
use App\Models\Va;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;

// Training Tracker — data layer moved off browser-direct Supabase into Laravel.
// The React app (apps/training/index.jsx) fetches these JSON endpoints instead
// of querying Supabase, and the activity_log writes happen here.
class TrainingController extends Controller
{
    public function __construct(private ActivityLogger $activity)
    {
    }

    // ---------------- Reads ----------------

    // Course Catalog: courses with nested modules + lessons.
    public function catalog()
    {
        return response()->json([
            'courses' => Course::orderBy('name')
                ->get(['course_id', 'name', 'category', 'description', 'cert']),
            'modules' => Module::orderBy('position')
                ->get(['module_id', 'course_id', 'name', 'position']),
            'lessons' => Lesson::orderBy('position')
                ->get(['lesson_id', 'module_id', 'name', 'position']),
        ]);
    }

    // Enriched VA roster (vas + employee names + agency + trainers). The
    // frontend assembles names/agency from these arrays.
    public function vaRoster()
    {
        return response()->json([
            'vas' => Va::get([
                'employee_id', 'account_id', 'title', 'type', 'status',
                'dev_trainer_id', 'ins_trainer_id', 'certified', 'started_at',
                'skills', 'bio', 'mods_done', 'mods_total', 'task_comp', 'tasks_run',
            ]),
            'employees' => Employee::get(['id', 'name', 'position']),
            'accounts' => Account::get(['account_id', 'hubspot_company_id']),
            'companies' => HubspotCompany::get(['id', 'name']),
        ]);
    }

    // Skills directory (root catalog + Settings view).
    public function skillsCatalog()
    {
        return response()->json([
            'skills' => SkillCatalog::get(['skill_id', 'category', 'name']),
        ]);
    }

    // Track view data: enrollments + module_progress + courses/modules + roster.
    public function track()
    {
        return response()->json([
            'enrollments' => Enrollment::get(['enrollment_id', 'va_id', 'course_id', 'track', 'started_at', 'completed']),
            'moduleProgress' => ModuleProgress::get(['module_progress_id', 'enrollment_id', 'module_id', 'pct', 'quiz_done', 'quiz_total']),
            'courses' => Course::get(['course_id', 'name', 'category', 'cert']),
            'modules' => Module::orderBy('position')->get(['module_id', 'course_id', 'name', 'position']),
            'employees' => Employee::get(['id', 'name']),
            'vaIds' => Va::pluck('employee_id'),
        ]);
    }

    // Dashboard counts.
    public function dashboard()
    {
        $total = Va::count();
        $deployed = Va::where('status', 'active')->count();

        return response()->json([
            'total' => $total,
            'deployed' => $deployed,
            'certified' => Va::where('certified', true)->count(),
            'courses' => Course::count(),
            'enrollments' => Enrollment::count(),
            'inTraining' => $total - $deployed,
        ]);
    }

    // Reports metrics.
    public function reports()
    {
        return response()->json([
            'certified' => Va::where('certified', true)->count(),
            'enrollments' => Enrollment::count(),
            'completed' => Enrollment::where('completed', true)->count(),
            'ratings' => Evaluation::whereNotNull('rating')->pluck('rating'),
            'courses' => Course::get(['course_id', 'name']),
            'enrollmentCourseIds' => Enrollment::pluck('course_id'),
        ]);
    }

    // ---------------- Course CRUD ----------------

    public function storeCourse(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'category' => 'required|string',
            'cert' => 'boolean',
        ]);

        $course = Course::create([
            'name' => $data['name'],
            'category' => $data['category'],
            'cert' => $data['cert'] ?? false,
        ]);

        $this->activity->log('training', 'training.course.created', 'course', $course->course_id, [
            'name' => $course->name,
        ]);

        return response()->json(['ok' => true, 'course_id' => $course->course_id]);
    }

    public function updateCourse(Request $request, string $course)
    {
        $model = Course::findOrFail($course);

        $data = $request->validate([
            'name' => 'sometimes|string',
            'category' => 'sometimes|string',
            'description' => 'sometimes|nullable|string',
            'cert' => 'sometimes|boolean',
        ]);

        $model->update($data);

        $this->activity->log('training', 'training.course.updated', 'course', $model->course_id, [
            'fields' => array_keys($data),
        ]);

        return response()->json(['ok' => true]);
    }

    public function destroyCourse(string $course)
    {
        $model = Course::findOrFail($course);
        $modIds = Module::where('course_id', $model->course_id)->pluck('module_id');
        if ($modIds->isNotEmpty()) {
            Lesson::whereIn('module_id', $modIds)->delete();
        }
        Module::where('course_id', $model->course_id)->delete();
        $model->delete();

        $this->activity->log('training', 'training.course.deleted', 'course', $course, []);

        return response()->json(['ok' => true]);
    }

    // ---------------- Module CRUD ----------------

    public function storeModule(Request $request)
    {
        $data = $request->validate([
            'course_id' => 'required|uuid',
            'name' => 'required|string',
            'position' => 'required|integer',
        ]);

        $module = Module::create($data);

        $this->activity->log('training', 'training.module.created', 'course', $data['course_id'], [
            'name' => $data['name'],
        ]);

        return response()->json(['ok' => true, 'module_id' => $module->module_id]);
    }

    public function updateModule(Request $request, string $module)
    {
        $model = Module::findOrFail($module);

        $data = $request->validate([
            'name' => 'sometimes|string',
            'position' => 'sometimes|integer',
        ]);

        $model->update($data);

        $this->activity->log('training', 'training.module.updated', 'course', $model->course_id, [
            'module_id' => $model->module_id,
            'fields' => array_keys($data),
        ]);

        return response()->json(['ok' => true]);
    }

    public function destroyModule(string $module)
    {
        $model = Module::findOrFail($module);
        $courseId = $model->course_id;
        Lesson::where('module_id', $model->module_id)->delete();
        $model->delete();

        $this->activity->log('training', 'training.module.deleted', 'course', $courseId, [
            'module_id' => $module,
        ]);

        return response()->json(['ok' => true]);
    }

    // ---------------- Lesson CRUD ----------------

    public function storeLesson(Request $request)
    {
        $data = $request->validate([
            'module_id' => 'required|uuid',
            'name' => 'required|string',
            'position' => 'required|integer',
        ]);

        $lesson = Lesson::create($data);

        $this->activity->log('training', 'training.lesson.created', 'module', $data['module_id'], [
            'name' => $data['name'],
        ]);

        return response()->json(['ok' => true, 'lesson_id' => $lesson->lesson_id]);
    }

    public function updateLesson(Request $request, string $lesson)
    {
        $model = Lesson::findOrFail($lesson);

        $data = $request->validate([
            'name' => 'sometimes|string',
            'position' => 'sometimes|integer',
        ]);

        $model->update($data);

        $this->activity->log('training', 'training.lesson.updated', 'module', $model->module_id, [
            'lesson_id' => $model->lesson_id,
            'fields' => array_keys($data),
        ]);

        return response()->json(['ok' => true]);
    }

    public function destroyLesson(string $lesson)
    {
        $model = Lesson::findOrFail($lesson);
        $moduleId = $model->module_id;
        $model->delete();

        $this->activity->log('training', 'training.lesson.deleted', 'module', $moduleId, [
            'lesson_id' => $lesson,
        ]);

        return response()->json(['ok' => true]);
    }

    // ---------------- VA skills ----------------

    public function updateVaSkills(Request $request, string $va)
    {
        $model = Va::findOrFail($va);

        $data = $request->validate([
            'skills' => 'present|array',
            'skills.*' => 'string',
            'verb' => 'required|in:added,removed',
            'skill' => 'nullable|string',
        ]);

        $model->update(['skills' => $data['skills']]);

        $this->activity->log('training', "training.va.skill_{$data['verb']}", 'va', $model->employee_id, [
            'skill' => $data['skill'] ?? null,
        ]);

        return response()->json(['ok' => true]);
    }

    // ---------------- Enrollments + module progress ----------------

    public function storeEnrollment(Request $request)
    {
        $data = $request->validate([
            'va_id' => 'required|uuid',
            'course_id' => 'required|uuid',
            'track' => 'nullable|string',
        ]);

        $enrollment = Enrollment::create([
            'va_id' => $data['va_id'],
            'course_id' => $data['course_id'],
            'track' => $data['track'] ?? null,
            'started_at' => now()->toDateString(),
            'completed' => false,
        ]);

        // Seed module_progress rows for every module of the course.
        $modIds = Module::where('course_id', $data['course_id'])->pluck('module_id');
        foreach ($modIds as $mid) {
            ModuleProgress::create([
                'enrollment_id' => $enrollment->enrollment_id,
                'module_id' => $mid,
                'pct' => 0,
                'quiz_done' => 0,
                'quiz_total' => 0,
            ]);
        }

        $this->activity->log('training', 'training.enrollment.created', 'enrollment', $enrollment->enrollment_id, [
            'va' => $data['va_id'],
            'course' => Course::whereKey($data['course_id'])->value('name'),
        ]);

        return response()->json(['ok' => true, 'enrollment_id' => $enrollment->enrollment_id]);
    }

    public function destroyEnrollment(string $enrollment)
    {
        $model = Enrollment::findOrFail($enrollment);
        $id = $model->enrollment_id;
        ModuleProgress::where('enrollment_id', $id)->delete();
        $model->delete();

        $this->activity->log('training', 'training.enrollment.removed', 'enrollment', $id, []);

        return response()->json(['ok' => true]);
    }

    // Cycle a module's progress for an enrollment (0 -> 50 -> 100), upserting the
    // module_progress row, then roll the enrollment's completed flag.
    public function updateModuleProgress(Request $request, string $enrollment)
    {
        $enr = Enrollment::findOrFail($enrollment);

        $data = $request->validate([
            'module_id' => 'required|uuid',
            'pct' => 'required|integer|min:0|max:100',
            'completed' => 'required|boolean',
            'module_name' => 'nullable|string',
        ]);

        $mp = ModuleProgress::where('enrollment_id', $enr->enrollment_id)
            ->where('module_id', $data['module_id'])
            ->first();

        $completedAt = $data['pct'] === 100 ? now()->toDateString() : null;

        if ($mp) {
            $mp->update(['pct' => $data['pct'], 'completed_at' => $completedAt]);
        } else {
            ModuleProgress::create([
                'enrollment_id' => $enr->enrollment_id,
                'module_id' => $data['module_id'],
                'pct' => $data['pct'],
                'quiz_done' => 0,
                'quiz_total' => 0,
                'completed_at' => $completedAt,
            ]);
        }

        if ((bool) $enr->completed !== $data['completed']) {
            $enr->update(['completed' => $data['completed']]);
        }

        $this->activity->log('training', 'training.module.progress', 'enrollment', $enr->enrollment_id, [
            'module' => $data['module_name'] ?? null,
            'pct' => $data['pct'],
        ]);

        return response()->json(['ok' => true]);
    }

    // ---------------- Skills catalog (Settings) ----------------

    public function storeSkill(Request $request)
    {
        $data = $request->validate([
            'category' => 'required|string',
            'name' => 'required|string',
        ]);

        $skill = SkillCatalog::create($data);

        $this->activity->log('training', 'training.skill.added', 'skill', $skill->skill_id, [
            'category' => $data['category'],
            'name' => $data['name'],
        ]);

        return response()->json(['ok' => true, 'skill_id' => $skill->skill_id]);
    }

    public function destroySkill(string $skill)
    {
        $model = SkillCatalog::findOrFail($skill);
        $details = ['category' => $model->category, 'name' => $model->name];
        $model->delete();

        $this->activity->log('training', 'training.skill.removed', 'skill', $skill, $details);

        return response()->json(['ok' => true]);
    }
}
