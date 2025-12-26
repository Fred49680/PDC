-- Migration: Trigger pour supprimer les affectations en conflit avec les absences
-- Date: 2025-12-22
-- Description: Crée un trigger qui supprime automatiquement les affectations 
--              qui chevauchent avec une période d'absence et crée une alerte

-- Fonction pour supprimer les affectations en conflit avec une absence et créer des alertes
CREATE OR REPLACE FUNCTION remove_affectations_on_absence()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affectation RECORD;
  v_ressource_nom TEXT;
  v_affaire_id_display TEXT;
  v_affaire_libelle TEXT;
BEGIN
  -- Ne traiter que les absences actives
  IF NEW.statut != 'Actif' THEN
    RETURN NEW;
  END IF;
  
  -- Récupérer le nom de la ressource pour l'alerte
  SELECT nom INTO v_ressource_nom
  FROM ressources
  WHERE id = NEW.ressource_id;
  
  -- Parcourir toutes les affectations qui chevauchent avec la période d'absence
  FOR v_affectation IN
    SELECT 
      a.id,
      a.affaire_id,
      a.site,
      a.competence,
      a.date_debut,
      a.date_fin,
      aff.affaire_id as affaire_id_display,
      aff.libelle as affaire_libelle
    FROM affectations a
    LEFT JOIN affaires aff ON a.affaire_id = aff.id
    WHERE a.ressource_id = NEW.ressource_id
      -- Vérifier le chevauchement des périodes
      AND a.date_debut <= NEW.date_fin
      AND a.date_fin >= NEW.date_debut
  LOOP
    -- Récupérer les infos de l'affaire si disponibles
    IF v_affectation.affaire_id_display IS NOT NULL THEN
      v_affaire_id_display := v_affectation.affaire_id_display;
      v_affaire_libelle := v_affectation.affaire_libelle;
    ELSE
      v_affaire_id_display := NULL;
      v_affaire_libelle := NULL;
    END IF;
    
    -- Créer une alerte avant de supprimer l'affectation
    INSERT INTO alertes (
      type_alerte,
      ressource_id,
      affaire_id,
      site,
      competence,
      date_debut,
      date_fin,
      action,
      prise_en_compte,
      courrier_statut,
      created_by
    ) VALUES (
      'Affectation supprimée - Absence',
      NEW.ressource_id,
      v_affectation.affaire_id,
      v_affectation.site,
      v_affectation.competence,
      v_affectation.date_debut,
      v_affectation.date_fin,
      'Affectation supprimée automatiquement suite à une absence (' || COALESCE(NEW.type, 'Absence') || ') du ' || 
      TO_CHAR(NEW.date_debut, 'DD/MM/YYYY') || ' au ' || TO_CHAR(NEW.date_fin, 'DD/MM/YYYY') || 
      CASE WHEN NEW.commentaire IS NOT NULL THEN '. Commentaire: ' || NEW.commentaire ELSE '' END,
      'Non',
      'A envoyer',
      NEW.saisi_par
    );
    
    -- Supprimer l'affectation
    DELETE FROM affectations
    WHERE id = v_affectation.id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur INSERT
DROP TRIGGER IF EXISTS trigger_remove_affectations_on_absence_insert ON absences;
CREATE TRIGGER trigger_remove_affectations_on_absence_insert
  AFTER INSERT ON absences
  FOR EACH ROW
  EXECUTE FUNCTION remove_affectations_on_absence();

-- Créer le trigger sur UPDATE (seulement si statut, date_debut ou date_fin changent)
DROP TRIGGER IF EXISTS trigger_remove_affectations_on_absence_update ON absences;
CREATE TRIGGER trigger_remove_affectations_on_absence_update
  AFTER UPDATE ON absences
  FOR EACH ROW
  WHEN (OLD.statut IS DISTINCT FROM NEW.statut OR OLD.date_debut IS DISTINCT FROM NEW.date_debut OR OLD.date_fin IS DISTINCT FROM NEW.date_fin)
  EXECUTE FUNCTION remove_affectations_on_absence();

