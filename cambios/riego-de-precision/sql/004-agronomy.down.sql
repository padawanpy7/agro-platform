-- 004 down -- removes the campaign, the soil, the satellite, the trap, the photo and the wizard.
--
-- WHAT DATA STAYS AND WHAT IS LOST (mandatory comment, AGENTS.md rule 7):
--   EVERYTHING THAT NO SENSOR PRODUCES IS LOST, and it is exactly the half that cannot be
--   re-measured: the yield, the discard, the soil profile, the phenological dates, what somebody
--   saw in the field, what the technician confirmed, and every photo's metadata and label.
--   The sensor series in `measurement` survives -- and becomes what it was before 004: a history
--   that describes and does not predict, because the label is gone.
--   Run 005's down first: it points at `campaign`, `experiment_block` and `observation`.

begin;

drop trigger if exists plot_inside_farm_trg on plot;
drop function if exists check_plot_inside_farm();
drop function if exists spatial_index_valid_fraction(integer, integer);

drop table if exists
  photo_history, treatment_history, observation_symptom_history, observation_history,
  pest_trap_catch_history, soil_analysis_result_history, soil_analysis_history,
  harvest_history, experiment_block_history, campaign_stage_history, campaign_history,
  experiment_factor_history, input_product_history, observation_extent_history,
  diagnosis_source_history, condition_history, symptom_history, pest_history,
  evalscript_history, index_source_history, index_type_history, soil_parameter_history,
  phenology_stage_history, crop_variety_history, crop_history cascade;

drop table if exists
  photo, treatment, diagnosis, observation_symptom, observation,
  pest_trap_catch, spatial_index, soil_analysis_result, soil_analysis,
  harvest, experiment_block, campaign_stage, campaign,
  experiment_factor, input_product, observation_extent, diagnosis_source,
  condition, symptom, pest, evalscript, index_source, index_type,
  soil_parameter, phenology_stage, crop_variety, crop cascade;

delete from permission where resource_code in
  ('campaign','harvest','experiment_block','soil_analysis','photo',
   'observation','diagnosis','treatment','spatial_index','pest_trap_catch');
delete from resource where code in
  ('campaign','harvest','experiment_block','soil_analysis','photo',
   'observation','diagnosis','treatment','spatial_index','pest_trap_catch');
delete from unit where code in
  ('ppm','cmol_kg','g_kg','pct_sat','g_cm3','ml','g','unit','kg_ha','l_ha');

commit;
