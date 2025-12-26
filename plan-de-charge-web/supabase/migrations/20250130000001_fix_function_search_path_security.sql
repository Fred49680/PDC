-- Migration: Correction du search_path pour toutes les fonctions
-- Ajoute SET search_path = public, pg_temp pour sécuriser toutes les fonctions
-- Date: 2025-01-30
--
-- Cette migration corrige les avertissements de sécurité concernant les fonctions
-- avec un search_path mutable, ce qui peut permettre des attaques par injection SQL.

-- ============================================================================
-- Fonctions sans paramètres ou avec signature unique
-- ============================================================================

ALTER FUNCTION public.normalize_site_uppercase() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_business_day(date) SET search_path = public, pg_temp;
ALTER FUNCTION public.disable_consolidation_triggers() SET search_path = public, pg_temp;
ALTER FUNCTION public.enable_consolidation_triggers() SET search_path = public, pg_temp;
ALTER FUNCTION public.consolidate_periodes_after_batch(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_calendrier(integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.consolidate_periodes_charge_for_competence(uuid, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.process_consolidation_notification() SET search_path = public, pg_temp;
ALTER FUNCTION public.consolidate_affectations(uuid, text, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.safe_bool_cast(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.consolidate_periodes_charge_background(uuid, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_jours_ouvres_periode() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_absence_statut() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_arret_maladie_30j() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_absences_statut_quotidien() SET search_path = public, pg_temp;
ALTER FUNCTION public.queue_consolidation(uuid, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_affaire_calculated_fields() SET search_path = public, pg_temp;
ALTER FUNCTION public.recalculate_all_affaires_fields() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_total_planifie_on_date_maj_raf() SET search_path = public, pg_temp;
ALTER FUNCTION public.process_consolidation_queue(integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.safe_bool_from_any(anyelement) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_consolidation_queue_status() SET search_path = public, pg_temp;
ALTER FUNCTION public.safe_bool_normalize(boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.insert_periode_charge(uuid, text, text, date, date, integer, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_periode_charge(uuid, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_affectation_conflict(uuid, date, date, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_ressource_absent(uuid, date) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.business_days_between(date, date) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_site_map(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_affaire_id(text, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_affaire_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.insert_periode_charge_v2(uuid, text, text, date, date, integer) SET search_path = public, pg_temp;

-- ============================================================================
-- Fonctions avec plusieurs signatures (surcharges)
-- ============================================================================

-- consolidate_periodes_charge : version trigger
ALTER FUNCTION public.consolidate_periodes_charge() SET search_path = public, pg_temp;

-- consolidate_periodes_charge : version avec paramètres
ALTER FUNCTION public.consolidate_periodes_charge(uuid, text, text) SET search_path = public, pg_temp;

-- trigger_consolidate_affectations : version trigger
ALTER FUNCTION public.trigger_consolidate_affectations() SET search_path = public, pg_temp;

-- trigger_consolidate_periodes_charge : version trigger
ALTER FUNCTION public.trigger_consolidate_periodes_charge() SET search_path = public, pg_temp;

-- trigger_consolidation_periodes_charge : version avec paramètres
ALTER FUNCTION public.trigger_consolidation_periodes_charge(text, text) SET search_path = public, pg_temp;

