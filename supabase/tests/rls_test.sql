\set QUIET on
\pset tuples_only on
\pset format unaligned
insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001','a@x'),('bbbbbbbb-0000-0000-0000-000000000002','b@x'),('cccccccc-0000-0000-0000-000000000003','c@x');
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub',u,false); end $$;
-- helper to assert
create or replace function public.t(name text, ok boolean) returns text language sql as $$ select case when ok then 'PASS ' else 'FAIL ' end || name $$;
grant execute on function public.t(text,boolean) to authenticated, anon;

-- A creates a baby and logs
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
set role authenticated;
select (public.create_baby('Mia','2026-08-10','{"feedH":3}','{"hair":"curls"}')).id \gset
select t('A sees own baby', (select count(*) from babies)=1);
select t('A is owner', (select role from baby_members where baby_id=:'id')='owner');
insert into events(id,baby_id,type,t,sub) values ('evA0001',:'id','feed',now(),'left');
insert into events(id,baby_id,type,t,end_t) values ('evA0002',:'id','sleep',now()-interval '2h',null);
select t('A sees events', (select count(*) from events)=2);
update babies set name='Mia Rose' where id=:'id';
select t('A can rename', (select name from babies where id=:'id')='Mia Rose');
reset role;

-- B is a stranger
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
set role authenticated;
select t('B sees no babies', (select count(*) from babies)=0);
select t('B sees no events', (select count(*) from events)=0);
select t('B sees no members', (select count(*) from baby_members)=0);
select t('B sees no invites', (select count(*) from invites)=0);
with u as (update babies set name='hacked' where id=:'id' returning 1) select t('B update A baby affects 0', (select count(*) from u)=0);
with d as (delete from events where baby_id=:'id' returning 1) select t('B delete A events affects 0', (select count(*) from d)=0);
\set ON_ERROR_STOP off
\echo -- expected errors follow (B writing into A):
insert into events(id,baby_id,type,t) values ('evB0002',:'id','feed',now());
insert into baby_members(baby_id,user_id,role) values (:'id','bbbbbbbb-0000-0000-0000-000000000002','owner');
insert into babies(name) values ('direct');
insert into invites(baby_id) values (:'id');
\set ON_ERROR_STOP on
reset role;
select t('B write did not land', (select count(*) from events where id like 'evB%')=0);
select t('B not member', (select count(*) from baby_members where user_id='bbbbbbbb-0000-0000-0000-000000000002')=0);

-- A invites B
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
set role authenticated;
insert into invites(baby_id) values (:'id') returning code \gset
reset role;
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
set role authenticated;
select t('B accepts invite', public.accept_invite(:'code')=:'id'::uuid);
select t('B accepting twice is fine', public.accept_invite(:'code')=:'id'::uuid);
select t('B now sees baby', (select count(*) from babies)=1);
select t('B now sees events', (select count(*) from events)=2);
insert into events(id,baby_id,type,t,sub) values ('evB0003',:'id','diaper',now(),'wet');
select t('B can log', (select count(*) from events)=3);
update events set end_t=now() where id='evA0002';
select t('B can end nap', (select end_t is not null from events where id='evA0002'));
with d as (delete from babies where id=:'id' returning 1) select t('B (caregiver) cannot delete baby', (select count(*) from d)=0);
reset role;

-- C tries used invite
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
set role authenticated;
\set ON_ERROR_STOP off
\echo -- expected error: invite already used
select public.accept_invite(:'code');
\echo -- expected error: invite not found
select public.accept_invite('nope');
\set ON_ERROR_STOP on
select t('C still sees nothing', (select count(*) from babies)=0 and (select count(*) from events)=0);
reset role;

-- expired invite
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
set role authenticated;
insert into invites(baby_id,expires_at) values (:'id', now()-interval '1 day') returning code as oldcode \gset
reset role;
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
set role authenticated;
\set ON_ERROR_STOP off
\echo -- expected error: invite expired
select public.accept_invite(:'oldcode');
\set ON_ERROR_STOP on
reset role;

-- anon
select pg_temp.as_user('');
set role anon;
\set ON_ERROR_STOP off
\echo -- expected error: anon cannot create
select public.create_baby('x',null,null,null);
\set ON_ERROR_STOP on
select t('anon sees nothing', (select count(*) from babies)=0);
reset role;

-- B leaves; A deletes account
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
set role authenticated;
delete from baby_members where baby_id=:'id' and user_id='bbbbbbbb-0000-0000-0000-000000000002';
select t('B left, sees nothing', (select count(*) from babies)=0);
reset role;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
set role authenticated;
select public.delete_my_account();
reset role;
select t('A baby gone', (select count(*) from babies)=0);
select t('A events gone', (select count(*) from events)=0);
select t('A login gone', (select count(*) from auth.users where email='a@x')=0);
select t('B login kept', (select count(*) from auth.users where email='b@x')=1);
