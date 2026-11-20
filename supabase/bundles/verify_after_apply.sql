-- NIVelo · comprobaciones DESPUÉS de aplicar apply_0100_a_0600.sql.
-- Solo lee datos. Cada fila debe decir ok = true.
select 'rol_nunca_viene_del_cliente' as comprobacion,
       pg_get_functiondef('public.handle_new_user'::regproc) not ilike '%raw_user_meta_data%''role''%' as ok
union all select 'un_solo_ciclo_activo_por_alumno',
       not exists (select 1 from public.enrollments where status = 'active' group by user_id having count(*) > 1)
union all select 'modulos_existentes_siguen_publicados',
       (select count(*) = count(*) filter (where published) from public.modules)
union all select 'funciones_de_progreso_creadas',
       (select count(*) = 7 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname in
           ('save_diagnostic','submit_module_quiz','record_vocab_review','get_due_vocab','complete_lesson','teacher_overview','teacher_student_detail'))
union all select 'alumnos_no_leen_respuestas_correctas',
       not has_column_privilege('authenticated', 'public.quiz_questions', 'correct_idx', 'select')
union all select 'alumnos_no_escriben_progreso_directo',
       not has_table_privilege('authenticated', 'public.module_progress', 'insert')
       and not has_table_privilege('authenticated', 'public.enrollments', 'insert')
union all select 'solo_full_name_editable_en_perfiles',
       not has_column_privilege('authenticated', 'public.profiles', 'role', 'update')
       and has_column_privilege('authenticated', 'public.profiles', 'full_name', 'update')
union all select 'bucket_de_audio_privado',
       exists (select 1 from storage.buckets where id = 'audio-cache' and not public)
union all select 'sin_datos_perdidos_en_contenido_a1',
       (select count(*) from public.lessons) >= 22 and (select count(*) from public.quiz_questions) >= 23 and (select count(*) from public.vocab_items) >= 54;
