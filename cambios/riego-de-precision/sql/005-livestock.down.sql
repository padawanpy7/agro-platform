-- 005 down -- removes livestock and unwires the animal from the four tables 004 left ready.
--
-- WHAT DATA STAYS AND WHAT IS LOST (mandatory comment, AGENTS.md rule 7):
--   EVERY ANIMAL, EVERY POSITION AND EVERY RATION IS LOST -- they live only in these tables.
--   And two things that are NOT in these tables are lost as well, which is the part worth reading:
--     * `measurement.animal_id`: the weights stay, but WHICH ANIMAL each one belonged to does not.
--       The rows survive as anonymous weights, which for a fattening model is the same as nothing.
--     * `observation.animal_id`, `treatment.animal_id`, `photo.animal_id` and their group twins:
--       the observation, the vaccine and the photo stay; what they were about does not.
--   Down is for a migration that has not run in production. This one is not reversible in the
--   sense that matters.

begin;

alter table photo       drop constraint photo_has_a_subject;
alter table photo       add  constraint photo_has_a_subject
  check (num_nonnulls(plot_id, campaign_id, block_id, observation_id) >= 1);
alter table treatment   drop constraint treatment_has_a_subject;
alter table treatment   add  constraint treatment_has_a_subject
  check (num_nonnulls(observation_id, plot_id, campaign_id, block_id) >= 1);
alter table observation drop constraint observation_has_a_subject;
alter table observation add  constraint observation_has_a_subject
  check (num_nonnulls(plot_id, campaign_id, block_id) >= 1);

alter table photo       drop column animal_id, drop column animal_group_id;
alter table treatment   drop column animal_id, drop column animal_group_id;
alter table observation drop column animal_id, drop column animal_group_id;
alter table measurement drop column animal_id;

drop trigger if exists ration_product_is_feed_trg on ration;
drop function if exists check_ration_product_is_feed();

drop table if exists ration_history, animal_group_member_history, animal_group_history,
                     animal_history, location_source_history, animal_status_history,
                     breed_history, animal_species_history cascade;
drop table if exists ration, animal_location, animal_group_member, animal, animal_group,
                     location_source, animal_status, breed, animal_species cascade;

delete from permission where resource_code in ('animal','animal_group','animal_location','ration');
delete from resource   where code in ('animal','animal_group','animal_location','ration');
delete from input_product where kind = 'feed';

commit;
