-- ============================================================================
-- CORRECTION DU TRIGGER INSERT POUR GÉRER nb_ressources = 0
-- ============================================================================
-- Description: Permet au trigger INSERT de se déclencher même avec nb_ressources = 0
-- pour déclencher la consolidation et découper les périodes existantes
-- ============================================================================

-- Supprimer l'ancien trigger INSERT
DROP TRIGGER IF EXISTS trigger_consolidate_periodes_charge_insert ON periodes_charge;

-- Créer le nouveau trigger INSERT qui se déclenche même avec nb_ressources = 0
-- Le trigger function gérera le cas nb_ressources = 0 en appelant la consolidation
CREATE TRIGGER trigger_consolidate_periodes_charge_insert
  AFTER INSERT ON periodes_charge
  FOR EACH ROW
  -- Supprimer la condition WHEN pour permettre le déclenchement même avec nb_ressources = 0
  -- Le trigger function vérifiera nb_ressources et appellera la consolidation appropriée
  EXECUTE FUNCTION trigger_consolidate_periodes_charge();

