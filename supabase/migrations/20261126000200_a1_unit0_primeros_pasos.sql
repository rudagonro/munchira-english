-- A1 · Unidad 0 «Primeros pasos» (aditiva). No modifica migraciones anteriores ni toca el progreso guardado.
-- 1. a1_unit0_progress: resultado del cuestionario de la Unidad 0, una fila por estudiante (RLS: solo el dueño
--    lee la suya; se escribe únicamente con la función). Tabla propia para no sumar la Unidad 0 a las 8 unidades.
-- 2. submit_a1_unit0_quiz(p_answers): califica en el servidor con las claves de content/a1/unit0.json.
--    70% o más aprueba; best_score solo sube y completed_at se conserva (coalesce).
-- 3. Banco de tarjetas (content/a1/card-bank.json) en el catálogo de Repaso: a1_vocab_items con unit_number = 0
--    y word_index = index estable de la tarjeta. Para eso el check de unit_number pasa de 1..8 a 0..8 (solo
--    amplía; ninguna fila existente cambia). record_a1_vocab_practice y get_due_vocab funcionan sin cambios.
-- El reconocimiento de estudiantes con avance A1 previo se calcula en la app (src/data/a1Course.js): no hace
-- falta escribir filas para ellos.
begin;
create table if not exists public.a1_unit0_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  best_score integer not null check (best_score between 0 and 100),
  last_score integer not null check (last_score between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
revoke all on public.a1_unit0_progress from anon, authenticated;
grant select on public.a1_unit0_progress to authenticated;
grant all on public.a1_unit0_progress to service_role;
alter table public.a1_unit0_progress enable row level security;
drop policy if exists a1_unit0_progress_owner on public.a1_unit0_progress;
create policy a1_unit0_progress_owner on public.a1_unit0_progress for select to authenticated using (user_id = auth.uid());

create or replace function public.submit_a1_unit0_quiz(p_answers jsonb)
returns public.a1_unit0_progress language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_key jsonb := '[2,0,3,1,1,3,0,2,3,1,2,0]'::jsonb;
  v_limits jsonb := '[4,4,4,4,4,4,4,4,4,4,4,4]'::jsonb;
  v_answer jsonb;
  v_correct integer := 0;
  v_score integer;
  v_count integer := jsonb_array_length(v_key);
  v_row public.a1_unit0_progress%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then raise exception 'invalid_answers' using errcode = '22023'; end if;
  if jsonb_array_length(p_answers) <> v_count then raise exception 'invalid_answers' using errcode = '22023'; end if;
  for i in 0..v_count-1 loop
    v_answer := p_answers -> i;
    if jsonb_typeof(v_answer) <> 'number' or (v_answer #>> '{}') !~ '^[0-9]+$' then raise exception 'invalid_answers' using errcode = '22023'; end if;
    if (v_answer #>> '{}')::numeric >= (v_limits ->> i)::integer then raise exception 'invalid_answers' using errcode = '22023'; end if;
    if v_answer = v_key -> i then v_correct := v_correct + 1; end if;
  end loop;
  v_score := round(v_correct * 100.0 / v_count)::integer;
  insert into public.a1_unit0_progress(user_id, best_score, last_score, completed_at)
  values (v_uid, v_score, v_score, case when v_score >= 70 then now() else null end)
  on conflict(user_id) do update
    set best_score = greatest(public.a1_unit0_progress.best_score, excluded.best_score),
        last_score = excluded.last_score,
        completed_at = coalesce(public.a1_unit0_progress.completed_at, excluded.completed_at),
        updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.submit_a1_unit0_quiz(jsonb) from public, anon;
grant execute on function public.submit_a1_unit0_quiz(jsonb) to authenticated;

alter table public.a1_vocab_items drop constraint if exists a1_vocab_items_unit_number_check;
alter table public.a1_vocab_items add constraint a1_vocab_items_unit_number_check check (unit_number between 0 and 8);

insert into public.a1_vocab_items(id,unit_number,word_index,english,spanish) values
('5f7f2000-63ad-53ec-b594-c607dd590f97',0,0,'one','uno'),
('86a3a568-42ad-568e-9624-a40bb10798fa',0,1,'two','dos'),
('93661f73-2ab7-513d-aacf-9bbef4744844',0,2,'three','tres'),
('ced2ed5a-b8b3-580a-8228-960592a83951',0,3,'four','cuatro'),
('48f0d448-5ac9-5441-8135-563c9c1ff9ea',0,4,'five','cinco'),
('355b8717-aab3-51cd-aca9-8519b49f22ec',0,5,'six','seis'),
('2e322c5f-b497-59db-988c-3284a5912d48',0,6,'seven','siete'),
('ec981efa-0bc5-5ed5-9f82-1c842b39937a',0,7,'eight','ocho'),
('e96209e9-dd7b-53fb-95ec-9c6cac1c3c30',0,8,'nine','nueve'),
('0a8ae587-4b1b-5f9c-8c45-0beca9aa0a61',0,9,'ten','diez'),
('070bd292-ceca-5e2c-82e5-bdffa29874e6',0,10,'eleven','once'),
('a76e3dc9-02cf-566d-bf82-b3d60b0f39d6',0,11,'twelve','doce'),
('80302f07-c68a-5587-8cbe-7bb76bc03370',0,12,'thirteen','trece'),
('9ca83829-2d5a-5fde-beea-c94ec5babfbc',0,13,'fourteen','catorce'),
('ab443059-3434-5f0e-9123-f3bee99a381b',0,14,'fifteen','quince'),
('432df5b5-0dbd-526c-9aaa-d3ee50d6ce28',0,15,'sixteen','dieciséis'),
('e9ad4824-d6c1-5701-bb7a-51406d4bd411',0,16,'seventeen','diecisiete'),
('c3593b28-30e2-5d4d-a86f-7d920b6ebdc9',0,17,'eighteen','dieciocho'),
('c4a61d89-38be-5553-8e40-da31f9f86948',0,18,'nineteen','diecinueve'),
('6b28ce86-3d66-5466-a6e5-ea26ab03e5a4',0,19,'twenty','veinte'),
('96096196-df69-500e-a50c-5082514421e3',0,20,'thirty','treinta'),
('1981038a-7132-5f6b-8515-867e002f09b7',0,21,'forty','cuarenta'),
('d8f0a0f4-ec34-5d0d-b32e-77f77765557a',0,22,'fifty','cincuenta'),
('76fc9148-ac98-5f42-9cea-731ebba734d4',0,23,'sixty','sesenta'),
('7a7952ab-f494-580c-a6d9-4f832b9dac02',0,24,'seventy','setenta'),
('b28f7def-c13f-5cb7-85e0-63954e8e0f85',0,25,'eighty','ochenta'),
('d9d5edb7-87e9-58f9-8f3b-f6f6520bb187',0,26,'ninety','noventa'),
('958cb151-f88a-58c4-af34-b378f4373216',0,27,'one hundred','cien'),
('cfe31c4d-2ac4-5b49-8908-0e60a7ef2434',0,28,'one thousand','mil'),
('1068a417-90d2-5669-ad25-2d6f9ed63150',0,100,'red','rojo'),
('5e9d2c3f-e2f5-542e-a3ca-b8f6081b45c1',0,101,'orange','naranja / anaranjado'),
('b02f3527-8f2f-50e3-a0bf-e7f38a9f6001',0,102,'yellow','amarillo'),
('2f4c9590-4728-5932-a3d2-609471c3a654',0,103,'green','verde'),
('8c87028e-0066-5dc3-8330-d3359e40ed36',0,104,'blue','azul'),
('19604a48-fb7b-5f0b-974a-25cdb36f6b81',0,105,'light blue','azul claro / celeste'),
('6a250cf6-c0cb-5841-b5af-501fa009a830',0,106,'purple','morado'),
('ff212d64-5685-5134-bbf2-5faeb3820525',0,107,'pink','rosado'),
('cc99ef57-406c-56ec-bae4-7dd63eb5bd5b',0,108,'brown','café / marrón'),
('37dca5ec-e424-5616-898e-7fc4f0e0e29e',0,109,'black','negro'),
('df055ae5-635d-553e-8737-040ea5af2722',0,110,'white','blanco'),
('552665cb-bac5-5e86-aa23-9fa04df33238',0,111,'gray','gris'),
('dff12320-9880-57c9-a13c-382f69effa10',0,200,'head','cabeza'),
('936149ac-234e-569f-a07d-693a9714727a',0,201,'face','cara'),
('6e270db0-4510-5210-a21e-44b0416826c4',0,202,'eye','ojo'),
('82461a39-67c6-5107-aaab-81df0b1d439b',0,203,'ear','oreja / oído'),
('c1a76fc2-fb15-5949-b276-562f5d1d7c5b',0,204,'nose','nariz'),
('ad9f203c-18be-561a-be09-012e2fab3b4f',0,205,'mouth','boca'),
('18129c55-aa33-5a73-8e50-44111a33ab33',0,206,'tooth','diente'),
('dce08cd1-b61a-510e-b9b9-046ebfed51f0',0,207,'tongue','lengua'),
('61e26d15-a5fd-5ae4-a5b9-5a371ec4fed7',0,208,'hand','mano'),
('6e19ef66-6d60-58fb-a019-42928b5d27e5',0,209,'finger','dedo'),
('6d835bcb-8fce-5004-8b99-3d8980ffc57b',0,210,'arm','brazo'),
('004404bb-52b7-579d-94e4-3245a01af42b',0,211,'leg','pierna'),
('e7613786-4af3-53f5-9c06-34024a52be0a',0,212,'foot','pie'),
('d833fc03-a40c-5d1e-91d7-785e54d12850',0,213,'heart','corazón'),
('e032661f-c97b-5f55-b809-5f6f9f6982a5',0,214,'bone','hueso'),
('4d4787b4-7f75-5422-9e4a-e269f955ba9f',0,300,'house','casa'),
('3501c071-3fc7-5a7c-91b9-786c830c4428',0,301,'door','puerta'),
('b22baa88-33f1-5aa7-9c63-3377c07a13f7',0,302,'window','ventana'),
('4f017d33-e2e9-5876-a5fe-631ac06cb902',0,303,'wall','pared'),
('941da0e8-f1d7-5dc6-9ea7-79821e9752eb',0,304,'bedroom','cuarto / habitación'),
('1484ebe1-eb87-5139-8d8a-9833c4f5539e',0,305,'bathroom','baño'),
('36b18cc9-c0a6-5146-b593-f5bfda76f323',0,306,'kitchen','cocina'),
('b4d4a6d4-0e0a-56ae-8be6-1b28c689d3da',0,307,'living room','sala'),
('29984d08-5c44-5481-a3cb-3a6ddf4203f2',0,308,'dining room','comedor'),
('2ae14fd7-285d-5874-bb02-1001d35d9c31',0,309,'garden','jardín'),
('44bbb931-0562-5b2c-8f8a-6581d7a28460',0,310,'key','llave'),
('5feddc75-6895-5880-923d-74ba1462f320',0,311,'chair','silla'),
('3194df9a-af92-524a-8cce-a45eb70f9452',0,312,'toilet','sanitario / inodoro'),
('f6373fd2-9285-5b77-b999-ede4de664949',0,313,'shower','ducha'),
('e7fc04a8-3a6c-5ebd-95ee-6a9e871b854b',0,314,'mirror','espejo'),
('4dee41c6-0712-5bfa-bf33-e571dec7a057',0,315,'lamp','lámpara'),
('37aca90e-0f05-502d-b56b-65bdf8e223dd',0,400,'car','carro'),
('14bed441-1812-57bc-9b11-ec229b51705e',0,401,'bus','bus'),
('f0cb0983-2599-5f43-b404-8fd95157ae3b',0,402,'taxi','taxi'),
('c81a8278-7d79-5e19-9588-025b86461ffc',0,403,'bike','bicicleta'),
('3cf08d5a-2707-5e20-b8c8-c3eefe74f11a',0,404,'motorcycle','moto'),
('fc94ea48-e724-5b00-a9c1-742076e57064',0,405,'truck','camión'),
('ea34c7f4-4c3f-56c1-9f81-7cb6f5977a5d',0,406,'train','tren'),
('ab8371c0-0f0f-5cd8-9d17-5692b4398916',0,407,'subway','metro'),
('c64e0eb3-bd88-519d-90c0-676d28a93de1',0,408,'cable car','metrocable / teleférico'),
('3a07bd08-7f0b-5e3f-881b-b36bdf52e5a1',0,409,'plane','avión'),
('cb2c2719-ac60-593b-8169-25389d23df66',0,410,'boat','barco / lancha'),
('42aace63-e7c0-525f-b04e-7d3dab4c91ff',0,411,'helicopter','helicóptero'),
('a213722d-cb60-5840-b016-96b8816eb42a',0,412,'ambulance','ambulancia'),
('489cc6b5-3b29-59e0-9ed8-982fb6e6133b',0,413,'on foot','a pie'),
('c7231d30-ffea-5aac-89ad-889af5e111f3',0,500,'hello','hola'),
('d9da9e6e-3ba2-5edd-aada-571856001815',0,501,'good morning','buenos días'),
('b8c736fe-230f-572d-abe5-e08031ba6734',0,502,'good afternoon','buenas tardes'),
('9ff71560-b2e3-5766-b2ac-ccb5383f8efe',0,503,'good evening','buenas noches (al llegar)'),
('e95415a1-3f43-5e6f-92f6-73c71283e614',0,504,'good night','buenas noches (al despedirte)'),
('335a597a-aead-59c1-894a-0203c607468b',0,505,'goodbye','adiós'),
('70d66dbc-e55c-5780-be19-c8b35d4f7055',0,506,'see you later','nos vemos'),
('282a06e3-12ac-525e-b7c6-4ee2fbdc7b99',0,507,'how are you?','¿cómo estás?'),
('c9be45a9-1ba5-5073-a8fd-15d18e63a035',0,508,'I''m fine','estoy bien'),
('b02b147a-b70d-5897-96ef-a68204e923da',0,509,'please','por favor'),
('84791fb5-9f92-5d3c-b60d-982cde6c2f0e',0,510,'thank you','gracias'),
('0f0af10f-2fcf-5f55-82de-e8f2c2c3059f',0,511,'you''re welcome','de nada'),
('3f2cbf63-ac8a-5315-ac49-652e68e17075',0,512,'sorry','perdón / lo siento'),
('d8f11d71-b405-5dbe-8d89-5e0402a860fe',0,513,'excuse me','disculpa / con permiso'),
('bad51f84-98b2-54dc-9a60-5108f59b8a8e',0,514,'nice to meet you','mucho gusto'),
('f0145cda-8b81-5f97-b30b-be2642292df0',0,600,'family','familia'),
('69ddc396-f79e-5f8d-9155-5e2db9cfc615',0,601,'parents','papás / padres'),
('08908399-0a9a-5a28-a75d-aee345246c74',0,602,'mother','mamá / madre'),
('6390a791-ec05-5483-bb5e-24f8b2a5af4f',0,603,'father','papá / padre'),
('c9ca1abd-18dc-576d-84ef-5ff7c840862c',0,604,'brother','hermano'),
('84ead3ab-7b2a-5d7e-aa1b-05a869233708',0,605,'sister','hermana'),
('25a1c8ef-4e67-580e-a3a0-748825385b08',0,606,'son','hijo'),
('22976e9e-f4cc-56d2-be91-b6f23d949cf5',0,607,'daughter','hija'),
('52b4ffbc-8fde-543f-8d6f-5e0de8a0f4f7',0,608,'grandmother','abuela'),
('81567feb-e064-5bd6-a098-f9081078eb70',0,609,'grandfather','abuelo'),
('64ce6d6f-b5a3-5ef6-bdef-5414a902ac07',0,610,'baby','bebé'),
('868310a1-461d-5f3e-a519-a1f08a03525a',0,611,'husband','esposo'),
('7c5bf38b-3827-5a7a-9e7a-714b4eed6e7f',0,612,'wife','esposa'),
('5ffdcd89-cde2-5892-9957-84c66d834115',0,700,'T-shirt','camiseta'),
('91647c54-01b1-581e-80be-aff5daf0ff0a',0,701,'shirt','camisa'),
('00e52144-3e8b-5bdd-a048-3356bd2058ae',0,702,'pants','pantalón'),
('e3b78e64-7dd6-5d21-af8c-18336308ef1c',0,703,'shorts','pantaloneta'),
('26ea6a55-f57a-5ca3-8adb-0c13c5cae9ed',0,704,'dress','vestido'),
('d0a8df28-a231-5641-9f13-2f8c739b3e91',0,705,'jacket','chaqueta'),
('c33cfc1f-66fc-53fe-aa9a-6b88f47013bf',0,706,'shoes','zapatos'),
('8bcea938-d7ca-565e-bde7-d45ef9545f5b',0,707,'sneakers','tenis'),
('7a091485-7eef-56fe-9ffe-af2a77153b30',0,708,'socks','medias'),
('02e415f9-6779-5e94-8f10-069e1a55f371',0,709,'cap','gorra'),
('845aecae-8b0e-58a1-a190-076a123afbcb',0,710,'scarf','bufanda'),
('0f00ed26-5046-5fa2-9ec1-3d9d33f39815',0,711,'gloves','guantes'),
('8aa993f8-556e-5170-86fc-ae139641cf81',0,712,'glasses','gafas'),
('ec2c3c1e-9e47-5ecb-bb21-17ed276f9d7f',0,713,'bag','bolso'),
('08997c60-fad5-5611-9150-b72afdda95d0',0,800,'water','agua'),
('706bb4fe-c37e-5c6b-b000-ae0024595932',0,801,'bread','pan'),
('c35f715d-b30c-5b99-969c-b32a0b335be3',0,802,'rice','arroz'),
('f6bebbc7-c2e9-5a9e-a0f5-62f17b113065',0,803,'egg','huevo'),
('6f4bbfa5-c796-58f8-ad8f-f03c97dbdbc7',0,804,'chicken','pollo'),
('dfc29e34-9993-5f9f-9e3f-8a04a8de045d',0,805,'meat','carne'),
('56a73020-4bc2-5a84-9274-bd13146a2d64',0,806,'fish','pescado'),
('b80617e1-c48a-5e1f-a964-e88ea122fe48',0,807,'cheese','queso'),
('4c4604a4-6fef-5a3c-a011-8b319d2f1c50',0,808,'milk','leche'),
('5a094228-d76d-5f9a-b5b4-95b1f0293b9e',0,809,'coffee','café'),
('161a437b-10a4-5dda-88ac-db22670c02cc',0,810,'juice','jugo'),
('8cd56e4b-2aff-541b-92d6-e0602a2ce948',0,811,'apple','manzana'),
('fdf4657f-c25b-568c-b838-a22c15ac2181',0,812,'banana','banano'),
('91d9311a-fea2-50fa-abc9-464caf85d787',0,813,'potato','papa'),
('4ba59890-d33a-593a-afdc-f06e212f2459',0,814,'soup','sopa'),
('8f0ae2e1-a901-5d02-ade9-7e7cb0c6a95b',0,815,'salad','ensalada'),
('8fca46eb-9874-5d11-be02-c496c2d1cf35',0,900,'Monday','lunes'),
('73d88dbb-f69c-5697-bfb1-4a846bfd385a',0,901,'Tuesday','martes'),
('65c44e5d-6d92-59a6-82e1-7de822a876de',0,902,'Wednesday','miércoles'),
('3fd13800-04a9-5b76-813e-1f870f1c76bf',0,903,'Thursday','jueves'),
('a89c34a8-3f86-50ea-b38e-8869f5fa42aa',0,904,'Friday','viernes'),
('0c43e920-e807-5ee8-8d7a-2da53734e4c5',0,905,'Saturday','sábado'),
('ac5c7509-4182-546e-9516-e4246a1cf245',0,906,'Sunday','domingo'),
('db43c191-59e4-54a9-b348-a435446dc590',0,1000,'January','enero'),
('ed9e97e1-a24f-5eff-bd68-3cdf9f1cdb0c',0,1001,'February','febrero'),
('3358ac8b-5ee3-596b-9793-b70be17078bd',0,1002,'March','marzo'),
('cced9acd-3e16-54a2-bf63-aefe15763e23',0,1003,'April','abril'),
('1da78919-a2a9-593f-941b-c5602d43564f',0,1004,'May','mayo'),
('6109dff6-49c7-540a-8797-ae71e15920e4',0,1005,'June','junio'),
('515f19d2-2cf3-54d5-94c9-55c3fa834ba8',0,1006,'July','julio'),
('e89fa4cd-db45-5040-9606-50a9a84c94d1',0,1007,'August','agosto'),
('93a09878-1d5b-5593-9684-332d19e2cf87',0,1008,'September','septiembre'),
('d0fac813-34d2-5a39-b411-e3422f3b8d1a',0,1009,'October','octubre'),
('815ef475-8b6a-55ae-9030-02eb664062b0',0,1010,'November','noviembre'),
('145dbdd7-6567-5ebb-a689-d1d960c83215',0,1011,'December','diciembre')
on conflict (unit_number,word_index) do nothing;
commit;
