-- 0600 · Las cuentas del personal (admin o docente) no dejan avance de alumno a su nombre (aditiva).
--
-- La app ya no escribe nada para el personal (unidades, Repaso, cuestionarios, módulos antiguos); esta
-- guarda lo asegura en la base: un trigger BEFORE INSERT OR UPDATE en las tablas de avance rechaza la
-- escritura cuando quien llama es admin o docente, aunque llegue por una función security definer
-- (calificación incluida). No borra ni modifica filas existentes; los borrados no se bloquean (borrar una
-- cuenta sigue funcionando). El service_role y las migraciones (auth.uid() nulo) no se ven afectados.
-- Para revisar el contenido con todo abierto, el personal usa el revisor, que no guarda nada.
-- NO APLICAR sin el OK del propietario.

create or replace function public.block_staff_progress_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and public.is_staff() then
    raise exception 'staff_no_write' using errcode = '42501',
      hint = 'Las cuentas del personal no guardan avance; usa el revisor.';
  end if;
  return new;
end;
$$;
revoke all on function public.block_staff_progress_writes() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'lesson_progress', 'module_progress', 'checkpoint_attempts', 'word_progress',
    'a1_unit_progress', 'a1_learning_drafts', 'a1_word_progress', 'a1_unit0_progress'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists zz_block_staff_progress_writes on public.%I', t);
      execute format(
        'create trigger zz_block_staff_progress_writes before insert or update on public.%I for each row execute function public.block_staff_progress_writes()',
        t);
    end if;
  end loop;
end;
$$;
