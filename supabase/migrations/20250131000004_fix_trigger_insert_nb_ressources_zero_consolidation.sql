-- ============================================================================
-- CORRECTION DU TRIGGER POUR GÉRER CORRECTEMENT nb_ressources = 0
-- ============================================================================
-- Description: Le trigger ne doit pas retourner NULL immédiatement pour nb_ressources = 0
-- Il doit insérer la période, puis déclencher la consolidation qui va l'exclure
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_consolidate_periodes_charge()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_affaire_id UUID;
  v_site TEXT;
  v_competence TEXT;
BEGIN
  -- Logs pour débogage
  RAISE NOTICE '[trigger_consolidate_periodes_charge] Déclenché - Opération: %, ID: %', TG_OP, COALESCE(NEW.id::text, OLD.id::text, 'N/A');
  
  -- Protection contre la récursion
  IF current_setting('app.consolidating', true) = 'true' THEN
    RAISE NOTICE '[trigger_consolidate_periodes_charge] Consolidation déjà en cours, retour immédiat';
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Récupérer les valeurs de la ligne modifiée
  IF TG_OP = 'DELETE' THEN
    v_affaire_id := OLD.affaire_id;
    v_site := OLD.site;
    v_competence := OLD.competence;
    RAISE NOTICE '[trigger_consolidate_periodes_charge] DELETE - affaire_id: %, site: %, competence: %', v_affaire_id, v_site, v_competence;
  ELSE
    -- Pour INSERT/UPDATE avec nb_ressources = 0, on laisse l'insertion se faire
    -- puis on déclenche la consolidation qui va exclure ce jour
    v_affaire_id := NEW.affaire_id;
    v_site := NEW.site;
    v_competence := NEW.competence;
    
    IF NEW.nb_ressources <= 0 THEN
      RAISE NOTICE '[trigger_consolidate_periodes_charge] nb_ressources = 0 détecté - Opération: %', TG_OP;
      RAISE NOTICE '[trigger_consolidate_periodes_charge] La période sera insérée puis exclue lors de la consolidation';
    ELSE
      RAISE NOTICE '[trigger_consolidate_periodes_charge] % - affaire_id: %, site: %, competence: %, nb_ressources: %', TG_OP, v_affaire_id, v_site, v_competence, NEW.nb_ressources;
    END IF;
  END IF;

  -- Appeler la fonction de consolidation pour cette combinaison
  -- La consolidation va décomposer toutes les périodes, exclure celles avec nb_ressources = 0,
  -- et reconstruire les périodes consécutives (découpage automatique)
  RAISE NOTICE '[trigger_consolidate_periodes_charge] Appel consolidation - affaire_id: %, site: %, competence: %', v_affaire_id, v_site, v_competence;
  PERFORM consolidate_periodes_charge_for_competence(v_affaire_id, v_site, v_competence);
  RAISE NOTICE '[trigger_consolidate_periodes_charge] Consolidation terminée';

  -- Retourner la ligne appropriée selon l'opération
  -- Pour INSERT avec nb_ressources = 0, on retourne NEW même si la période sera supprimée par la consolidation
  -- car l'insertion doit se faire pour que la consolidation puisse l'exclure
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[trigger_consolidate_periodes_charge] ERREUR: % - %', SQLSTATE, SQLERRM;
    RAISE;
END;
$$;

-- ============================================================================
-- FONCTION POUR DÉSACTIVER/ACTIVER LES TRIGGERS TEMPORAIREMENT
-- ============================================================================
-- Utile pour les affectations de masse où on veut éviter les consolidations multiples
CREATE OR REPLACE FUNCTION disable_consolidation_triggers()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  ALTER TABLE periodes_charge DISABLE TRIGGER trigger_consolidate_periodes_charge_insert;
  ALTER TABLE periodes_charge DISABLE TRIGGER trigger_consolidate_periodes_charge_update;
  ALTER TABLE periodes_charge DISABLE TRIGGER trigger_consolidate_periodes_charge_delete;
  RAISE NOTICE 'Triggers de consolidation désactivés';
END;
$$;

CREATE OR REPLACE FUNCTION enable_consolidation_triggers()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_insert;
  ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_update;
  ALTER TABLE periodes_charge ENABLE TRIGGER trigger_consolidate_periodes_charge_delete;
  RAISE NOTICE 'Triggers de consolidation activés';
END;
$$;

-- Fonction pour déclencher la consolidation manuellement après une affectation de masse
CREATE OR REPLACE FUNCTION trigger_consolidation_after_batch(
  p_affaire_id UUID,
  p_site TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_competence TEXT;
BEGIN
  -- Consolider pour chaque compétence distincte de cette affaire/site
  FOR v_competence IN 
    SELECT DISTINCT competence 
    FROM periodes_charge 
    WHERE affaire_id = p_affaire_id 
      AND site = UPPER(p_site)
  LOOP
    PERFORM consolidate_periodes_charge_for_competence(p_affaire_id, p_site, v_competence);
  END LOOP;
  
  RAISE NOTICE 'Consolidation manuelle terminée pour affaire_id: %, site: %', p_affaire_id, p_site;
END;
$$;

