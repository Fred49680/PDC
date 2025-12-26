-- Migration: Trigger pour vérifier les absences lors de la création d'une affectation
-- Date: 2025-12-22
-- Description: Ajoute un trigger BEFORE INSERT sur affectations pour empêcher 
--              la création d'affectations en conflit avec des absences actives

-- Fonction pour vérifier les absences existantes lors de la création d'une affectation
CREATE OR REPLACE FUNCTION check_absences_on_affectation_insert()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_absence RECORD;
  v_affaire_id_display TEXT;
  v_affaire_libelle TEXT;
BEGIN
  -- Parcourir toutes les absences actives qui chevauchent avec la nouvelle affectation
  FOR v_absence IN
    SELECT 
      a.id,
      a.ressource_id,
      a.date_debut,
      a.date_fin,
      a.type,
      a.commentaire,
      a.saisi_par
    FROM absences a
    WHERE a.ressource_id = NEW.ressource_id
      AND a.statut = 'Actif'
      -- Vérifier le chevauchement des périodes
      AND a.date_debut <= NEW.date_fin
      AND a.date_fin >= NEW.date_debut
  LOOP
    -- Récupérer les infos de l'affaire si disponibles
    SELECT aff.affaire_id, aff.libelle 
    INTO v_affaire_id_display, v_affaire_libelle
    FROM affaires aff
    WHERE aff.id = NEW.affaire_id;
    
    -- Créer une alerte
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
      NEW.affaire_id,
      NEW.site,
      NEW.competence,
      NEW.date_debut,
      NEW.date_fin,
      'Affectation supprimée automatiquement suite à une absence (' || COALESCE(v_absence.type, 'Absence') || ') du ' || 
      TO_CHAR(v_absence.date_debut, 'DD/MM/YYYY') || ' au ' || TO_CHAR(v_absence.date_fin, 'DD/MM/YYYY') || 
      CASE WHEN v_absence.commentaire IS NOT NULL THEN '. Commentaire: ' || v_absence.commentaire ELSE '' END,
      'Non',
      'A envoyer',
      v_absence.saisi_par
    );
    
    -- Supprimer l'affectation qui vient d'être créée
    -- On retourne NULL pour annuler l'insertion
    RETURN NULL;
  END LOOP;
  
  -- Si aucune absence en conflit, on accepte l'affectation
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur INSERT de affectations
DROP TRIGGER IF EXISTS trigger_check_absences_on_affectation_insert ON affectations;
CREATE TRIGGER trigger_check_absences_on_affectation_insert
  BEFORE INSERT ON affectations
  FOR EACH ROW
  EXECUTE FUNCTION check_absences_on_affectation_insert();

