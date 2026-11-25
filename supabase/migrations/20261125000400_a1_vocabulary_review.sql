-- Additive A1 vocabulary review. No existing scores, courses or progress are changed.
begin;
create table if not exists public.a1_vocab_items (
 id uuid primary key, unit_number integer not null check(unit_number between 1 and 8),
 word_index integer not null check(word_index >= 0), english text not null, spanish text not null,
 unique(unit_number,word_index)
);
revoke all on public.a1_vocab_items from anon,authenticated;
grant select on public.a1_vocab_items to authenticated;
grant all on public.a1_vocab_items to service_role;
alter table public.a1_vocab_items enable row level security;
drop policy if exists a1_vocab_catalog_read on public.a1_vocab_items;
create policy a1_vocab_catalog_read on public.a1_vocab_items for select to authenticated using(true);
create table if not exists public.a1_word_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 vocab_item_id uuid not null references public.a1_vocab_items(id),
 repetitions integer not null default 0, interval_days integer not null default 0,
 ease_factor numeric not null default 2.5, correct_count integer not null default 0,
 incorrect_count integer not null default 0, next_review timestamptz not null default now(),
 last_reviewed_at timestamptz, primary key(user_id,vocab_item_id)
);
revoke all on public.a1_word_progress from anon,authenticated;
grant select on public.a1_word_progress to authenticated;
grant all on public.a1_word_progress to service_role;
alter table public.a1_word_progress enable row level security;
drop policy if exists a1_word_progress_owner on public.a1_word_progress;
create policy a1_word_progress_owner on public.a1_word_progress for select to authenticated using(user_id=auth.uid());
create index if not exists a1_word_progress_due on public.a1_word_progress(user_id,next_review);
insert into public.a1_vocab_items(id,unit_number,word_index,english,spanish) values
('852a40cb-dfc8-57fa-b4e6-9464ffd4fd37',1,0,'hello','hola'),
('99808e8e-cceb-56d1-afb6-5b5008c1f7fd',1,1,'hi','hola (informal)'),
('083e3caf-cf51-581a-a72c-837a26849fd5',1,2,'nice to meet you','mucho gusto'),
('d5715855-64f0-5c52-bb73-c391295ca9da',1,3,'good morning','buenos días'),
('9e281eb4-0932-562f-a0ad-d256d347c020',1,4,'good afternoon','buenas tardes'),
('1d783fe5-c124-5b9b-9d7e-f7d694a4ccc3',1,5,'good evening','buenas noches (al saludar)'),
('8b11d6bd-2a15-58ff-9aff-140f35309e22',1,6,'good night','buenas noches (al despedirte)'),
('e32bbd05-9340-5acd-8475-1b570251dea5',1,7,'goodbye','adiós'),
('3c7c921a-c5e9-59cc-98a2-51dacc05eaa1',1,8,'bye','adiós (informal)'),
('20637135-c265-5047-8f30-9071dd3a4329',1,9,'see you','nos vemos'),
('88ae577d-5f8f-5225-bbb1-3918e892857e',1,10,'see you later','nos vemos luego'),
('b09a6634-0caa-5bb4-8c72-36922fad644e',1,11,'later','luego'),
('d6662730-1a1b-539d-9647-33d4dab88613',1,12,'my name is','mi nombre es'),
('085531d4-6ab5-576d-8b0d-62e24cc97a8c',1,13,'name','nombre'),
('05ddaa59-b003-57cf-a057-a2b75c919246',1,14,'I am / I''m','yo soy'),
('b0bac17f-1aa2-547e-b7cd-49603c4a3002',1,15,'what''s your name?','¿cuál es tu nombre?'),
('8294f89c-7b44-56d7-b9fd-7b7bac9ccb9d',1,16,'and you?','¿y tú?'),
('da6c7e59-64db-55d7-8323-48ce100f6024',1,17,'I am from','soy de'),
('bd82ad99-5614-521d-8137-9c67631ec6ab',1,18,'where are you from?','¿de dónde eres?'),
('8fed1b7d-49eb-5806-9f7c-643c0ee980bf',1,19,'how are you?','¿cómo estás?'),
('65675bb6-c43d-5bd0-8ab8-046f11fe973a',1,20,'I am fine','estoy bien'),
('eb6aa0e1-f677-5396-97f7-4967480e1221',1,21,'yes','sí'),
('f1b88710-abcf-5ef1-867f-dcc2dfe6c8fa',1,22,'no','no'),
('2c8cb7cd-cca4-5293-8f31-07738a9146c9',1,23,'please','por favor'),
('3b2b7c58-fa33-59e6-84f4-d5efb16fe376',1,24,'thank you','gracias'),
('7f08e985-41ed-5977-b1a0-928713d8cda6',1,25,'thanks','gracias (informal)'),
('e84573ea-4154-5081-b432-2ce8bd5906cc',1,26,'student','estudiante'),
('9a708ffb-0d67-54e1-a6ec-db5ad02f9e65',1,27,'teacher','profesor'),
('37723787-d3cf-578c-9cdd-70bd73d7f113',1,28,'years old','años (de edad)'),
('f0fbbba7-d21d-5121-9437-db999aff970b',2,0,'Family','familia'),
('3145478e-dea4-5e72-a643-163b0468b918',2,1,'Mother','madre'),
('5619851c-e88d-5e64-9fa5-1789acd4f1ac',2,2,'Mom','mamá'),
('527cb0b7-a846-58b5-9ac7-2e6aaa7cfeb4',2,3,'Father','padre'),
('a9f80f25-6370-5514-9d48-abe631d50ef5',2,4,'Dad','papá'),
('70f92b5a-bc42-5a30-b0e5-ef5f020c543d',2,5,'Parents','padres'),
('1df452bc-bb0d-576a-800a-edee778d688f',2,6,'Brother','hermano'),
('801cb26e-9b28-585b-b060-99df0885d67c',2,7,'Sister','hermana'),
('fc7c1e15-5450-563f-8267-6c93355480cf',2,8,'Son','hijo'),
('769b8a3b-6c3b-56c0-a3be-0b821156876a',2,9,'Daughter','hija'),
('6031cc0d-efbb-5d27-8f13-650274403e0b',2,10,'Husband','esposo'),
('c28de6ce-53d0-5954-b4c4-4e21a43e93b1',2,11,'Wife','esposa'),
('e8ba51b9-b9a8-5233-b3b1-ef9bb3b9325a',2,12,'Children','hijos'),
('71c4d613-8a55-5560-9862-289af2fb20e9',2,13,'How old are you?','¿cuántos años tienes?'),
('e4f92099-cb71-57fb-ace4-995263d60a26',2,14,'I am … years old','tengo … años'),
('8be0b477-30b7-505a-849a-5a5d46b71503',2,15,'Married','casado'),
('7590b509-9d8b-5d54-9fe3-19015d864f28',2,16,'Single','soltero'),
('5e67c91a-6bca-518f-8a0d-47202b134ce6',2,17,'This is','este'),
('240226a3-fbea-523f-852d-4b38ad1b939e',2,18,'My','mi'),
('c710a59c-9c1d-5630-a726-774e01ca573f',2,19,'His','su (de él)'),
('defe6a55-03f4-5629-ad72-c2874d603bd6',2,20,'Her','su (de ella)'),
('fd264ba5-36c7-5725-a3db-4bed3f5572e4',2,21,'Their','su (de ellos)'),
('3951d94d-f25b-54dc-bd81-5d765804461f',2,22,'Have','tener'),
('d2912a71-ba2d-57d9-a8e6-2f2c0fba2e8c',2,23,'Has','tener'),
('c3c686e1-80d2-543e-8ca0-14b1508b0be9',2,24,'Phone number','número de teléfono'),
('a758f6bc-8978-5026-a73f-e3db5de2bc22',2,25,'Address','dirección'),
('4bb80917-d656-526a-84b5-eb393bbd0fc8',2,26,'Email','correo electrónico'),
('68be08fd-80c4-57a9-8216-710fb8607da6',2,27,'Birthday','cumpleaños'),
('c572bfca-8f0f-5036-9c24-ee47d9ed13e2',2,28,'Job','trabajo'),
('a7024a9c-13ed-5d4a-b33d-2886debe91ff',2,29,'Nationality','nacionalidad'),
('29ba0622-8d40-540e-8483-6c94bf7e7231',2,30,'twenty','veinte'),
('a70072e4-8a28-5611-9aeb-99f25e7fdec2',2,31,'thirty','treinta'),
('f2fb71bf-1290-5750-b2d5-eb084e96ea5c',2,32,'forty','cuarenta'),
('29236adb-54de-5fc6-970e-c113c57ac665',2,33,'fifty','cincuenta'),
('25f4ddc1-26e9-5f8c-8e78-645a6e28e0d6',2,34,'sixty','sesenta'),
('51840021-dcbd-5f11-832d-04127051b6ef',2,35,'twenty-five','veinticinco'),
('90f7db21-28d4-5dfb-a613-6341cd330330',2,36,'fifty-two','cincuenta y dos'),
('72941827-ece6-53c1-8620-d228826cb0c2',3,0,'Wake up','despertarse'),
('49bd03df-0a9e-515c-960c-415cbfe82961',3,1,'Get up','levantarse'),
('abaf1e65-a5a0-523d-9e16-251d24bdbdf5',3,2,'Have breakfast','desayunar'),
('9a1e91c8-e317-5495-9d7d-9b5b078ac822',3,3,'Go to work','ir al trabajo'),
('01e66764-1396-5880-be5d-80df23a321f1',3,4,'Go to school','ir a la escuela'),
('2505532b-037e-5e9d-b342-d5d3f2c109ea',3,5,'Have lunch','almorzar'),
('633010c0-bf0b-52e0-bbbc-1308d3239e63',3,6,'Work','trabajar'),
('5d519f60-eabb-54e2-b960-05b8e83b2ae0',3,7,'Study','estudiar'),
('cfeb4f16-e794-52ee-bc80-3db8d1242d49',3,8,'Have dinner','cenar'),
('26e38825-dca4-57ca-bdd0-f47af6b886d1',3,9,'Watch TV','ver televisión'),
('2d93f025-d595-555a-9abc-448b4d064565',3,10,'Go to bed','irse a la cama'),
('aaac0192-4e66-5c59-9b4d-2e1227401d54',3,11,'Every day','todos los días'),
('1466b570-b493-5746-846b-eb48d34fb763',3,12,'In the morning','por la mañana'),
('71c85f24-3274-50a9-bd8d-3f2dc1f91e40',3,13,'In the afternoon','por la tarde'),
('e16b209b-8a32-5303-a934-dc4d1ecda72c',3,14,'In the evening','por la noche'),
('ac30261c-97ea-5ac0-810d-07f9a812eb98',3,15,'At night','de noche'),
('d480c5f1-652f-5fac-9141-93c09e652384',3,16,'What time','a qué hora'),
('2b879826-cdfc-50b9-ad1d-dfae35a5e8aa',3,17,'O''clock','en punto'),
('4b9e7ca5-4e2d-54ae-a27d-ca7175020869',3,18,'Always','siempre'),
('ccd8b9da-9ac3-500d-84e1-80f8a249b637',3,19,'Usually','normalmente'),
('b8ef0d0a-0103-5928-9304-0df739b82ba5',3,20,'Sometimes','a veces'),
('8aee279d-744e-5900-96ef-c9320c336216',3,21,'Never','nunca'),
('0b131137-c661-5092-a26a-742076b17f23',3,22,'Early','temprano'),
('7167ffd9-4fef-525c-839a-bea1726c30a0',3,23,'Late','tarde'),
('cea3e037-e785-54ef-a423-2517a5037a7c',3,24,'Routine','rutina'),
('4eb62782-37bd-50ae-a327-7f59d855648b',4,0,'House','casa'),
('39d07d0a-05a4-52f6-8c1b-3f1f14270094',4,1,'Apartment','apartamento'),
('8dcd4c59-38ed-51ee-a13b-5a345af0c79c',4,2,'Room','habitación'),
('63791b41-0d9a-5936-8886-d5749e37ba29',4,3,'Living room','sala'),
('98b40146-a460-5587-a221-0878f2a703e5',4,4,'Kitchen','cocina'),
('b78c1eaa-36a5-5116-9e20-fcc2b666725d',4,5,'Bedroom','dormitorio'),
('b5bb5dea-8cfe-5256-8995-f2f500e2b509',4,6,'Bathroom','baño'),
('466c4551-4a0b-5a96-a339-6f02aa6017f6',4,7,'There is','hay (singular)'),
('8ba679af-b8a1-53d8-9a09-54e81d483b73',4,8,'There are','hay (plural)'),
('22539e6d-3f81-531e-9982-9e209ed3b81f',4,9,'Big','grande'),
('4e6a8c2e-2ad4-5df5-becc-e602de75a426',4,10,'Small','pequeño'),
('97e2fc06-6b78-568f-9121-cc4167816d1a',4,11,'In','en'),
('59ebeb83-30af-5b05-92f3-71257301fc2b',4,12,'On','sobre'),
('18f73036-ab95-58fd-a8ac-f5ef32047948',4,13,'Under','debajo'),
('64367661-227c-564b-a2ad-271f7a57913d',4,14,'Next to','al lado de'),
('65d7b295-69f1-5e98-b57a-8b69b24736f1',4,15,'City','ciudad'),
('a336a460-fba7-5b87-8183-c9b57ffaa578',4,16,'Street','calle'),
('61203265-f891-52c1-b5e2-965da43e0977',4,17,'Bank','banco'),
('08a4b4ba-2ed3-523e-b5c0-58d93dab05fe',4,18,'Supermarket','supermercado'),
('2f41f147-23b2-523d-853b-ee3b74cd5f9d',4,19,'Park','parque'),
('093b4ef4-23cf-5207-a72f-67debe7f1054',4,20,'Hospital','hospital'),
('535ef5af-cc99-54ee-a43e-94add10bdb35',4,21,'School','escuela'),
('f8c590e9-de03-5ca6-900a-eaac09fb4931',4,22,'Turn left','gira a la izquierda'),
('285321a0-4e2e-5e10-ae92-df2a1074d4a3',4,23,'Turn right','gira a la derecha'),
('85f58685-a204-5f19-8889-d0d93d16a9bc',4,24,'Go straight','sigue derecho'),
('e608c353-b413-5738-be5d-d86eec620135',4,25,'Near','cerca'),
('c4aa22c7-fdf6-5fd2-b16f-ca4d5173087b',4,26,'Far','lejos'),
('7a111154-c981-5c3c-97a1-317d956e2436',5,0,'Food','comida'),
('1f71f94e-9d13-5d61-931c-34a3e55e840b',5,1,'Drink','bebida'),
('77722ae9-7dad-50a0-a383-d63215f914a8',5,2,'Breakfast','desayuno'),
('6346c367-15ed-54e6-bf74-ff64787c55e3',5,3,'Lunch','almuerzo'),
('26397a08-c0a7-513c-ac94-827c2080d7e9',5,4,'Dinner','cena'),
('af97421e-c8a3-583e-b911-bc141748bbef',5,5,'Bread','pan'),
('038452e6-d13e-518f-b7f3-789077a9624e',5,6,'Water','agua'),
('bfcdc574-408f-59ac-9ec7-2258bb9ed096',5,7,'Coffee','café'),
('4be15e6c-8534-51e7-8296-0f1aaf2e97f5',5,8,'Tea','té'),
('53b98bf7-f7f6-5d9e-98be-9cd50494c63f',5,9,'Milk','leche'),
('0c20fe18-8e23-5363-8056-0eb426978a13',5,10,'Meat','carne'),
('efce2966-85c0-50ac-a4b8-80b49c325d56',5,11,'Chicken','pollo'),
('ce6fdfd2-d5e3-58ef-bc8e-15fe8bc9317e',5,12,'Fish','pescado'),
('563bf0b1-2469-5dca-b0ec-9fd6d4ce7691',5,13,'Vegetables','verduras'),
('74cbd686-2c30-5f67-8d7b-b376b61f7626',5,14,'Fruit','fruta'),
('e92f7612-88b7-5a54-986d-dd13a8367836',5,15,'Apple','manzana'),
('dcfa9e49-09bd-50db-a7a0-a172d2ba455d',5,16,'I like','me gusta'),
('8741263b-dec6-54bc-bbf6-336d57a34879',5,17,'I don''t like','no me gusta'),
('d198401b-0c15-5575-8102-8b51c6ba80c6',5,18,'How much','cuánto'),
('5a7c1d76-b14d-5025-b41a-8b5dfe1b881e',5,19,'Price','precio'),
('0e788c7e-e08a-5299-838a-9fab2e6a75ca',5,20,'Buy','comprar'),
('06cc1eab-d753-5f79-bdab-c130f5ac6a89',5,21,'Shop','tienda'),
('f525ac63-b779-5b4b-a1da-45662a06a1f8',5,22,'Menu','menú'),
('0d3fbd1a-af3c-5d04-9255-2212d77e9a10',5,23,'I''d like','quisiera'),
('61b99aae-aad6-5928-99bc-3933072b7172',5,24,'Can I have','¿me puede dar?'),
('01183bd8-9ae7-52d3-9ffa-bfe99ea3a123',5,25,'red meat','carne roja'),
('7828771f-3ee8-54a4-8fea-69674fce0b24',5,26,'sandwich','sándwich'),
('a6fbe5de-c0fa-57d2-a665-10f42db3bc33',5,27,'some','algo de'),
('4fa7d52f-14a1-5e0b-b051-8fc69d296905',5,28,'dollars','dólares'),
('2d784382-d253-565b-a64e-8fdf981480d9',6,0,'Free time','tiempo libre'),
('ffb63771-435b-5fd7-9e82-9fe4ab40e4ab',6,1,'Hobby','pasatiempo'),
('f4af8179-63b0-5e54-85a2-8fcb73077043',6,2,'Play','jugar'),
('b1cc96a2-f33b-5285-b50f-70a1fb0983c1',6,3,'Football','fútbol'),
('f6b5ed4e-c741-53e2-86f0-7098a18919da',6,4,'Listen to music','escuchar música'),
('c8079ea1-8d7a-568d-9419-2f73e873cfc5',6,5,'Read','leer'),
('5c068b5d-cf57-5130-b47f-d934f91941fe',6,6,'Watch','ver'),
('7656a78d-f899-5c0e-aaff-a9538519d51c',6,7,'Go out','salir'),
('8587c4c4-b5dc-502e-9858-c6742fc6d791',6,8,'Stay home','quedarse en casa'),
('67071cb0-85a6-5560-93ed-8c4a91069928',6,9,'Friend','amigo'),
('a9d67164-cda1-52d5-885a-c30ea76de8c0',6,10,'Weekend','fin de semana'),
('379d3075-aa9a-5702-b84a-6fc9030a8db0',6,11,'On Saturday','el sábado'),
('eb214efd-31a1-528d-b0ca-d2d693d14412',6,12,'Like','gustar'),
('9dc226fe-78e9-5639-9bfd-b599e3faa89c',6,13,'Love','encantar'),
('eec0176f-5f63-5dee-968a-e1875c835a88',6,14,'Hate','odiar'),
('17f10f80-4ede-5e94-8e6e-e61043205aa0',6,15,'Prefer','preferir'),
('b12ca1ea-357c-5896-aa55-b70967772083',6,16,'Always','siempre'),
('16f59a18-c2fc-5039-a27d-c961257179fc',6,17,'Often','a menudo'),
('3bd654fb-c1af-5851-9bb0-f09b0ba15859',6,18,'Sometimes','a veces'),
('b8b9c7b9-160c-52bc-90d5-e39c9e3877fd',6,19,'Never','nunca'),
('81dde7c8-812e-58b3-8d19-8536f35a7aaa',6,20,'With','con'),
('a1b57911-e317-5a43-84e2-7b69faab6c15',6,21,'At the weekend','el fin de semana'),
('3596b833-6af9-5f05-b623-7e16186c91b9',6,22,'Sport','deporte'),
('b12c2180-155d-5c47-9fe3-2ceb4d060fd5',6,23,'Movie','película'),
('c51c1de3-0b51-5c3d-b1c3-108479fa879c',6,24,'Book','libro'),
('a0ec23a0-841a-5848-863d-a9d6352648b7',6,25,'tennis','tenis'),
('5d7339c2-0ce8-5007-b500-43fac3fec7e3',6,26,'reading','leer (actividad)'),
('1b24253f-ef95-5032-9799-b067156f0f32',7,0,'Travel','viajar'),
('82e845d4-efa1-5b26-a889-2ac2b2832248',7,1,'Trip','viaje'),
('91f89d66-6aea-53ab-b525-0ff7924f4730',7,2,'Bus','autobús'),
('0eaabb02-2c92-5de8-b100-8541621ab0f1',7,3,'Train','tren'),
('931c1c62-913c-593f-959b-21e8e05d1349',7,4,'Taxi','taxi'),
('4dc6ad38-f502-53d9-8b87-f74284aeecab',7,5,'Car','coche'),
('ba2b749e-86fc-562c-ac3b-7d70eabc28bd',7,6,'Walk','caminar'),
('a033060c-36c2-55e7-8db3-41e3f60f8f99',7,7,'Station','estación'),
('6f8f138f-b8ff-5c0d-876e-6fb18c8dd8b1',7,8,'Airport','aeropuerto'),
('c5711527-0260-54b5-b296-911cb267e4e7',7,9,'Ticket','billete'),
('a22ff165-1031-579a-88f9-fd8a2e1dbf87',7,10,'How do I get to…?','¿cómo llego a…?'),
('f1690532-e8cf-5087-8010-596ab16a22b0',7,11,'Where is…?','¿dónde está…?'),
('788db914-0586-5368-b30b-04efd1abb443',7,12,'Turn left','gira a la izquierda'),
('756ded7c-65df-5c20-8f7f-cfedd6213f25',7,13,'Turn right','gira a la derecha'),
('8716a7c4-4d6b-5844-a75f-b34b380a6294',7,14,'Go straight','sigue derecho'),
('84ad9918-4bd5-533c-b374-129ab6af4a3a',7,15,'On the left','a la izquierda'),
('0824d60b-7e1d-5441-97eb-9930a4912d70',7,16,'On the right','a la derecha'),
('64129b22-b2d9-56d2-aa70-1586eb0c2c64',7,17,'Near','cerca'),
('490bf061-7a86-57ed-bdc8-ce096d551bc8',7,18,'Far','lejos'),
('5d103afd-b19b-5205-88e8-1c0429dca3ad',7,19,'Map','mapa'),
('a84b6a98-f551-5c24-bb9e-7014cc40e5a3',7,20,'Excuse me','disculpe'),
('df1d99dd-e17a-5d44-b8bd-715279f59e10',7,21,'I''m lost','estoy perdido'),
('6206fcac-8daa-5376-8bc5-a974624a032c',7,22,'Take the bus','tomar el autobús'),
('19f6b5be-c892-59a4-a33b-e25ef43b8b68',7,23,'Get off','bajarse'),
('190bbfd6-c92d-510a-a9f9-e83069a32199',7,24,'Next to','al lado de'),
('ba6de2a7-8f0d-54e6-9a93-0a0b3b0a0591',8,0,'Introduce yourself','presentarse'),
('49381f55-cc01-5eeb-aa37-94a5e93b0d45',8,1,'Personal information','datos personales'),
('721f87e8-8d06-58e0-8837-720324ac0846',8,2,'Daily routine','rutina diaria'),
('1e853774-1c7a-51c3-81e7-fe2c8799dee0',8,3,'My house','mi casa'),
('b219da28-9ff6-5cd8-afef-93a8800f7c70',8,4,'In the city','en la ciudad'),
('611dd037-146e-55db-8cc7-85e43b7791e0',8,5,'Food and drinks','comida y bebidas'),
('45050297-e262-5f57-8f16-30a21356050d',8,6,'Free time activities','actividades de tiempo libre'),
('8a07e819-3555-558b-a9e3-9ccfc4c0a240',8,7,'Ask for directions','pedir direcciones'),
('2507024a-a23a-542e-82f3-50b134890901',8,8,'I can…','puedo…'),
('39df83f9-4a98-587c-b776-393c30ae1a21',8,9,'Review','repaso')
on conflict(id) do nothing;

-- Private scheduler used by the two authenticated entry points.
create or replace function public.schedule_a1_word(p_id uuid,p_known boolean,p_practice boolean)
returns public.a1_word_progress language plpgsql security definer set search_path='' as $$
declare
 uid uuid := auth.uid(); r public.a1_word_progress%rowtype;
begin
 if uid is null then raise exception 'not_authenticated' using errcode='28000'; end if;
 if p_known is null then raise exception 'invalid_grade' using errcode='22023'; end if;
 if not exists(select 1 from public.a1_vocab_items where id=p_id) then raise exception 'vocab_item_not_found' using errcode='P0002'; end if;
 if not p_practice and not exists(select 1 from public.a1_word_progress where user_id=uid and vocab_item_id=p_id) then
  raise exception 'word_not_practiced' using errcode='22023';
 end if;
 insert into public.a1_word_progress(user_id,vocab_item_id) values(uid,p_id) on conflict do nothing;
 select * into r from public.a1_word_progress where user_id=uid and vocab_item_id=p_id for update;
 -- A correction or the other direction of the same card must not hide a recent difficulty.
 if p_known and r.last_reviewed_at is not null and
    ((r.repetitions=0 and r.next_review>now()) or (p_practice and r.last_reviewed_at>now()-interval '1 day')) then return r; end if;
 if p_known then
  r.repetitions := r.repetitions+1;
  r.interval_days := case r.repetitions when 1 then 1 when 2 then 6 else least(greatest(round(r.interval_days*r.ease_factor)::integer,1),365) end;
  r.ease_factor := least(3.0,r.ease_factor+0.05);
  r.correct_count := r.correct_count+1;
  r.next_review := now()+make_interval(days=>r.interval_days);
 else
  r.repetitions := 0; r.interval_days := 0;
  r.ease_factor := greatest(1.3,r.ease_factor-0.2);
  r.incorrect_count := r.incorrect_count+1;
  r.next_review := now()+interval '10 minutes';
 end if;
 update public.a1_word_progress set repetitions=r.repetitions,interval_days=r.interval_days,
 ease_factor=r.ease_factor,correct_count=r.correct_count,incorrect_count=r.incorrect_count,
 next_review=r.next_review,last_reviewed_at=now() where user_id=uid and vocab_item_id=p_id returning * into r;
 return r;
end; $$;
revoke all on function public.schedule_a1_word(uuid,boolean,boolean) from public,anon,authenticated;
create or replace function public.record_a1_vocab_practice(p_unit integer,p_word integer,p_known boolean)
returns public.a1_word_progress language plpgsql security definer set search_path='' as $$
declare vid uuid;
begin
 select id into vid from public.a1_vocab_items where unit_number=p_unit and word_index=p_word;
 if vid is null then raise exception 'vocab_item_not_found' using errcode='P0002'; end if;
 return public.schedule_a1_word(vid,p_known,true);
end; $$;
create or replace function public.record_a1_vocab_review(p_vocab_item_id uuid,p_known boolean)
returns public.a1_word_progress language sql security definer set search_path='' as $$
 select public.schedule_a1_word(p_vocab_item_id,p_known,false);
$$;
revoke all on function public.record_a1_vocab_practice(integer,integer,boolean),public.record_a1_vocab_review(uuid,boolean) from public,anon;
grant execute on function public.record_a1_vocab_practice(integer,integer,boolean),public.record_a1_vocab_review(uuid,boolean) to authenticated;
create or replace function public.get_due_vocab(p_limit integer default 20)
returns table(id uuid,module_id uuid,english text,spanish text,example_sentence text,next_review timestamptz)
language sql stable security invoker set search_path='' as $$
 select * from (
  select v.id,v.module_id,v.english,v.spanish,v.example_sentence,w.next_review
  from public.word_progress w join public.vocab_items v on v.id=w.vocab_item_id
  where w.user_id=auth.uid() and w.next_review<=now()
  union all
  select v.id,null::uuid,v.english,v.spanish,null::text,w.next_review
  from public.a1_word_progress w join public.a1_vocab_items v on v.id=w.vocab_item_id
  where w.user_id=auth.uid() and w.next_review<=now()
 ) due order by next_review,id limit greatest(least(coalesce(p_limit,20),100),1);
$$;
commit;
