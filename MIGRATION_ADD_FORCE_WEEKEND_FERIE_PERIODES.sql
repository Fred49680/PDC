-- Migration : Ajouter la colonne force_weekend_ferie à la table periodes_charge
-- Cette colonne indique si une période de charge a été forcée (confirmée) pour un week-end ou jour férié

-- Ajouter la colonne si elle n'existe pas
ALTER TABLE periodes_charge
ADD COLUMN IF NOT EXISTS force_weekend_ferie BOOLEAN DEFAULT FALSE;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN periodes_charge.force_weekend_ferie IS 'Indique si cette période de charge a été forcée (confirmée) pour un week-end ou jour férié';

-- Créer un index pour améliorer les performances des requêtes filtrant sur force_weekend_ferie = TRUE
CREATE INDEX IF NOT EXISTS idx_periodes_charge_force_weekend_ferie
ON periodes_charge(force_weekend_ferie)
WHERE force_weekend_ferie = TRUE;
