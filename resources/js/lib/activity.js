// resources/js/lib/activity.js
// The append-only audit write. Every meaningful state change in every app calls
// this. Same shape the spine aggregates for SOC 2 evidence. Insert only; the DB
// has no update/delete policy, so attempts to mutate the log fail by design.
//
// action is namespaced <app>.<entity>.<verb>, e.g. 'qa.build.status_changed'.
import { supabase } from './supabase';

export async function logActivity({
  app,            // 'qa' | 'devsupport' | 'training' | 'clientprofile' | 'portal'
  actor,          // the employee object from useSession (or its id+email)
  action,         // '<app>.<entity>.<verb>'
  entityType,
  entityId,
  details = null, // jsonb: before/after where it matters
}) {
  try {
    const { error } = await supabase.from('activity_log').insert({
      app,
      actor_id: actor?.id ?? null,
      actor_email: actor?.email ?? null,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId != null ? String(entityId) : null,
      details,
    });
    if (error) console.error('[activity_log] insert failed:', error.message);
  } catch (e) {
    console.error('[activity_log] insert threw:', e);
  }
}
