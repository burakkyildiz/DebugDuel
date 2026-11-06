-- Include orphaned run records whose end_time was never written after a crash.
-- Scope the deletion to this application's two jobs, never other project jobs.
select cron.schedule('debug-duel-maintenance','0 0 * * *',$job$
  select private.cleanup_game_data();
  delete from cron.job_run_details where coalesce(end_time,start_time)<clock_timestamp()-interval '7 days'
    and jobid in(select jobid from cron.job where jobname in ('debug-duel-advance-matches','debug-duel-maintenance'));
$job$);
