-- Migration pour insérer les ressources initiales et leurs compétences
-- Note: Cette migration utilise des CTE pour gérer les insertions de manière optimale

BEGIN;

-- ===================================================================
-- 1. Insérer les ressources uniques (une seule ligne par NomPrenom)
-- ===================================================================
WITH ressources_data AS (
  SELECT DISTINCT ON (nom_prenom)
    nom_prenom,
    type_contrat,
    site,
    responsable,
    actif,
    date_fin
  FROM (VALUES
    ('ABARKAN Amin', 'APP', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('ABDELHAKK Mourad', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('ABELS Joanna', 'ETT', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('AKTAS Melih', 'ETT', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('APPELBAUM Vianney', 'CDI', 'BELLEVILLE', 'BARBEROT Matthieu', 'OUI', NULL),
    ('AUFRERE Didier', 'CDI', 'BELLEVILLE', 'BARBEROT Matthieu', 'OUI', NULL),
    ('BAMANA MADZOKO Ange', 'CDI', 'CHINON', 'NAIMI Laïd', 'OUI', NULL),
    ('BARBEROT Matthieu', 'CDI', 'SAVIGNY', 'LOIRAT Michel', 'OUI', NULL),
    ('BAUDRY Frédéric', 'CDI', 'SAVIGNY', 'BARBEROT Matthieu', 'OUI', NULL),
    ('BENOIST Numa', 'CDI', 'CHINON', 'NAIMI Laïd', 'OUI', NULL),
    ('BENSALEM Rafik', 'ETT', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('BERGEOT Marine', 'CDI', 'BLAYAIS', 'TOURNIER Antoine', 'OUI', NULL),
    ('BERTAULT Frédéric', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('BERTHEAU Anthony', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('BERTHIER Marwin', 'CDI', 'DAMPIERRE', 'HEZZI Ridha', 'OUI', NULL),
    ('BERTHOUD Ludovic', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('BERTRAND Antoine', 'ETT', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('BLASCO Kévin', 'CDI', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('BOIS John', 'ETT', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', '2026-01-30'),
    ('BOISSEAU Pascal', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('BONGIOVANNI F.', 'CDI', 'GOLFECH', 'CORRECH Christian', 'OUI', NULL),
    ('BOUAOUD KEVIN', 'CDI', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('BOULEDJOUDJA Nasser', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('BOULINEAU Damien', 'ETT', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('BOURDEAU Mathieu', 'CDI', 'SAVIGNY', 'DUPUY Alain', 'OUI', NULL),
    ('BOURIAL Rachid', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('BOUSSIKHANI Khalid', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('BOUVET THEO', 'CDI', 'BLAYAIS', 'LAFON Sébastien', 'OUI', NULL),
    ('BRUCY Eric', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('CADEAU Jérome', 'ETT', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('CARRE Steven', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('CATEAU Alexandre', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('CENSE Anthony', 'CDI', 'GOLFECH', 'CORRECH Christian', 'OUI', NULL),
    ('CHANTEREAU Yoann', 'CDI', 'DAMPIERRE', 'HEZZI Ridha', 'OUI', NULL),
    ('CHEVRIER Alain', 'CDI', 'GOLFECH', 'CORRECH Christian', 'OUI', NULL),
    ('CHIRINIAN Philippe', 'CDI', 'SAINT-LAURENT', 'LECLERCQ Christophe', 'OUI', NULL),
    ('CHOISY Matthieu', 'CDI', 'BELLEVILLE', 'BARBEROT Matthieu', 'OUI', NULL),
    ('CHUDEAU Quentin', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('CLEMENT Lucas', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('COILLIOT Valentin', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('COLLAS Valentin', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('CORRECH Chrisitan', 'CDI', 'GOLFECH', 'TOURNIER Antoine', 'OUI', NULL),
    ('COUCHOURON Jean Christophe', 'CDI', 'SAVIGNY', 'LOIRAT Michel', 'OUI', NULL),
    ('COURVALET Sébastien', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('DAGOUNEAU Jimmy', 'CDI', 'BELLEVILLE', 'BARBEROT Matthieu', 'OUI', NULL),
    ('DANET Nicolas', 'CDI', 'GOLFECH', 'CORRECH Christian', 'OUI', NULL),
    ('DAVID Douglas', 'CDI', 'SAVIGNY', 'DUPUY Alain', 'OUI', NULL),
    ('DAVID Jordan', 'ETT', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('DEAGOSTINI Logan', 'CDI', 'BELLEVILLE', 'BARBEROT Matthieu', 'OUI', NULL),
    ('DEFORGES MICKAEL', 'CDI', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('DELABY Steven', 'CDI', 'CHINON', 'NAIMI Laïd', 'OUI', NULL),
    ('DELAIGUE Luc', 'ETT', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('DELNOMDEDIEU Yoann', 'CDI', 'BLAYAIS', 'LAFON Sébastien', 'OUI', NULL),
    ('DELORME CERISIER Cédric', 'CDI', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('DEMESTRE Steven', 'ETT', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('DEMICHELIS Thomas', 'ETT', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('DESCHAMPS Guillaume', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('DEVANNE Hubert', 'ETT', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('DEZE Erika', 'CDI', 'SAVIGNY', 'LOIRAT Michel', 'OUI', NULL),
    ('DIDIER Sullivan', 'ETT', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('DROUOT Vincent', 'CDI', 'BELLEVILLE', 'BARBEROT Matthieu', 'OUI', NULL),
    ('DUBOIS Nathan', 'ETT', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('DUMETZ Kévin', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('DUPUY Alain', 'CDI', 'SAVIGNY', 'LOIRAT Michel', 'OUI', NULL),
    ('DUTEMPLE Sullyvan', 'ETT', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('EDOLFI Didier', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('EL MOURABIT Saïd', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('ESCAFIT Bastien', 'CDI', 'GOLFECH', 'CORRECH Christian', 'OUI', NULL),
    ('FARJAUDOU Alexandra', 'ETT', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('FAUVELLE Julien', 'CDI', 'DAMPIERRE', 'BARBEROT Matthieu', 'OUI', NULL),
    ('FOLIARD Clement', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('FONTAINE Tim', 'ETT', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('FOUBERT Enzo', 'ETT', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('FOUCHER Félicie', 'ETT', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('FOUCHER Melodie', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('FOULON Thomas', 'ETT', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('GALLET Arnaud', 'CDI', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('GARDERA Nicolas', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('GARDERA Richard', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('GERVIER Quentin', 'APP', 'SAVIGNY', 'DUPUY Alain', 'OUI', NULL),
    ('GIBEAU Matthis', 'ETT', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('GIUGLAR Jean-luc', 'ETT', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('GODINEAU André', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('GRANDJEAN Maxime', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('GRATIA Jason', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('GUILLET Nicolas', 'ETT', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('HAMMAMI Lotfi', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('HAMMI Sofiane', 'ETT', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('HECHT Mathieu', 'CDI', 'BLAYAIS', 'TOURNIER Antoine', 'OUI', NULL),
    ('HENUSET Kevin', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('HEU Tong', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('JARRY Yohann', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('JUCQUOIS Cyril', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('KLIN Tony', 'CDI', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('LA VILLE Aurélia', 'CDI', 'BLAYAIS', 'LAFON Sébastien', 'OUI', NULL),
    ('LAFAGE Gabin', 'CDI', 'GOLFECH', 'CORRECH Christian', 'OUI', NULL),
    ('LAFON Olivier', 'CDI', 'BLAYAIS', 'LAFON Sébastien', 'OUI', NULL),
    ('LAFON Sébastien', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('LASALLE Laurent', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('LASSALLE Marie', 'CDI', 'BLAYAIS', 'LAFON Sébastien', 'OUI', NULL),
    ('LE CALVEZ Denis', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('LE COMPAS Vincent', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('LEBEAU Christian', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('LECLERCQ Christophe', 'CDI', 'SAVIGNY', 'LOIRAT Michel', 'OUI', NULL),
    ('LEDUC Dylan', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('LEGER Fabrice', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('LESIEUX Sidoine', 'CDI', 'BLAYAIS', 'LAFON Sébastien', 'OUI', NULL),
    ('LILA Papa Mor', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('LOIRAT Michel', 'CDI', 'SAVIGNY', 'LOIRAT Michel', 'OUI', NULL),
    ('LORENZO Guillaume', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('LY Eric', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('LY Tsou Tchia', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('MANDOT Angi', 'ETT', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('MANDOT Jason', 'ETT', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('MARCHET Stéphane', 'ETT', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('MARIN Léo', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('MARSEILLE Jean Philippe', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('MARTINS Nicolas', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('MASSAT Jean-Didier', 'CDI', 'GOLFECH', 'CORRECH Christian', 'OUI', NULL),
    ('MAYELE Oleo', 'ETT', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('MEFTAH Imed', 'CDI', 'BELLEVILLE', 'BARBEROT Matthieu', 'OUI', NULL),
    ('MEKKID Oualid', 'CDI', 'GOLFECH', 'CORRECH Christian', 'OUI', NULL),
    ('MENARD Adrien', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('MENDES Armano', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('MENERO Tédy', 'CDI', 'GOLFECH', 'CORRECH Christian', 'OUI', NULL),
    ('MESSAOUDI Samir', 'ETT', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('MIEULET Franck', 'CDI', 'SAINT-LAURENT', 'LECLERCQ Christophe', 'OUI', NULL),
    ('MOREAU Benoit', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('MOREAU Joël', 'CDI', 'SAINT-LAURENT', 'LECLERCQ Christophe', 'OUI', NULL),
    ('MOTARD Frederic', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('MOUILLON Remy', 'CDI', 'CHINON', 'NAIMI Laïd', 'OUI', NULL),
    ('NAIMI Laïd', 'CDI', 'SAVIGNY', 'BARBEROT Matthieu', 'OUI', NULL),
    ('NDIAYE Cheikh', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('NERON Jean-francois', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('PACHNOPOULOS Naome', 'CDI', 'BLAYAIS', 'TOURNIER Antoine', 'OUI', NULL),
    ('PASDELOUP Joseph', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('PASQUIER Pascal', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('PASTRE Mathis', 'ETT', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('PATUREAU Tiffany', 'ETT', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('PENOT Robin', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('PERRIN Julien', 'CDI', 'GOLFECH', 'CORRECH Christian', 'OUI', NULL),
    ('PERRIN Nathan', 'ETT', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('PESQUEREL Noémie', 'CDI', 'SAVIGNY', 'HEZZI Ridha', 'OUI', NULL),
    ('PETIT Sarah', 'ETT', 'SAVIGNY', 'LOIRAT Michel', 'OUI', NULL),
    ('PILLARD Alexandre', 'CDI', 'SAVIGNY', 'DUPUY Alain', 'OUI', NULL),
    ('PITAULT Christophe', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('POUSSE Charles', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('PRIEUR Claude -Henri', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('PRIMASE Valentin', 'CDI', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('PROUST Lucas', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('RMILI Omar', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('ROBERT David', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('ROBINET Mickael', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('ROBLIN Julien', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('ROL Pascal', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('ROULEAU Maxence', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('ROUZIES Julien', 'CDI', 'GOLFECH', 'CORRECH Christian', 'OUI', NULL),
    ('ROY Bernard', 'CDI', 'BLAYAIS', 'LAFON Sébastien', 'OUI', NULL),
    ('ROY Jean Francois', 'CDI', 'BELLEVILLE', 'BARBEROT Matthieu', 'OUI', NULL),
    ('ROY Maximilien', 'ETT', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('SALIN Florian', 'CDI', 'DAMPIERRE', 'BARBEROT Matthieu', 'OUI', NULL),
    ('SAVARY Guilhem', 'ETT', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('SEILLER Steven', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('SERPEBOIS Anis', 'ETT', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('SEVILLE Stephanie', 'CDI', 'CHINON', 'LECLERCQ Christophe', 'OUI', NULL),
    ('SISSOKO PECHON Lenny', 'CDI', 'SAINT-LAURENT', 'LECLERCQ Christophe', 'OUI', NULL),
    ('SLIMANI Kheireddine', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('STIEVENARD Paul', 'ETT', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('STOPYRA Françoise', 'CDI', 'SAVIGNY', 'LOIRAT Michel', 'OUI', NULL),
    ('TESSIER Nicolas', 'ETT', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('TESSIER Quentin', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('THAVENET Alain', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('THOR Jérome', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('TOULLEC Matthieu', 'CDI', 'BLAYAIS', 'HEZZI Ridha', 'OUI', NULL),
    ('TOURNIER Antoine', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('VANG Nou', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('VATAN Antonin', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('VERRON Denis', 'CDI', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', NULL),
    ('VIDEAU Vincent', 'CDI', 'BLAYAIS', 'BERGEOT Marine', 'OUI', NULL),
    ('VIGNALS Remy', 'ETT', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL),
    ('WEPSIEC Elsa', 'CDI', 'SAVIGNY', 'HEZZI Ridha', 'OUI', NULL),
    ('XIONG Mathis', 'ETT', 'DAMPIERRE', 'FAUVELLE Julien', 'OUI', '2026-01-30'),
    ('ZANCHI Lény', 'CDI', 'BLAYAIS', 'HECHT Mathieu', 'OUI', NULL)
  ) AS t(nom_prenom, type_contrat, site, responsable, actif, date_fin)
),
ressources_inserted AS (
  INSERT INTO ressources (nom, site, type_contrat, responsable, actif, date_fin_contrat, created_at, updated_at)
  SELECT 
    rd.nom_prenom,
    rd.site,
    rd.type_contrat,
    rd.responsable,
    CASE WHEN rd.actif = 'OUI' THEN true ELSE false END,
    CASE 
      WHEN rd.date_fin IS NULL THEN NULL
      WHEN rd.date_fin::text = 'null' THEN NULL
      ELSE rd.date_fin::date
    END,
    NOW(),
    NOW()
  FROM ressources_data rd
  WHERE NOT EXISTS (
    SELECT 1 FROM ressources r WHERE r.nom = rd.nom_prenom
  )
  RETURNING id, nom
)
-- ===================================================================
-- 2. Insérer les compétences pour chaque ressource
-- ===================================================================
INSERT INTO ressources_competences (ressource_id, competence, type_comp, created_at)
SELECT 
  r.id,
  comp_data.competence,
  comp_data.type_comp,
  NOW()
FROM (
  VALUES
    -- ABARKAN Amin
    ('ABARKAN Amin', 'AUTO', 'P'),
    ('ABARKAN Amin', 'IEG', 'S'),
    ('ABARKAN Amin', 'PACK', 'S'),
    -- ABDELHAKK Mourad
    ('ABDELHAKK Mourad', 'IEG', 'P'),
    -- ABELS Joanna
    ('ABELS Joanna', 'IEG', 'S'),
    ('ABELS Joanna', 'RELEVE', 'P'),
    -- AKTAS Melih
    ('AKTAS Melih', 'IEG', 'P'),
    -- APPELBAUM Vianney
    ('APPELBAUM Vianney', 'IEG', 'P'),
    -- AUFRERE Didier
    ('AUFRERE Didier', 'IEG', 'P'),
    ('AUFRERE Didier', 'IES', 'S'),
    ('AUFRERE Didier', 'INSTRUM', 'S'),
    ('AUFRERE Didier', 'K1', 'S'),
    ('AUFRERE Didier', 'RELEVE', 'S'),
    -- BAMANA MADZOKO Ange
    ('BAMANA MADZOKO Ange', 'IES', 'P'),
    ('BAMANA MADZOKO Ange', 'RELEVE', 'S'),
    -- BARBEROT Matthieu
    ('BARBEROT Matthieu', 'BE_IES', 'S'),
    ('BARBEROT Matthieu', 'ENCADREMENT', 'P'),
    ('BARBEROT Matthieu', 'FIBRE OPTIQUE', 'S'),
    -- BAUDRY Frédéric
    ('BAUDRY Frédéric', 'ENCADREMENT', 'P'),
    ('BAUDRY Frédéric', 'IEG', 'S'),
    ('BAUDRY Frédéric', 'PACK', 'S'),
    ('BAUDRY Frédéric', 'PREPA', 'S'),
    ('BAUDRY Frédéric', 'ESSAIS', 'S'),
    ('BAUDRY Frédéric', 'RELEVE', 'S'),
    -- BENOIST Numa
    ('BENOIST Numa', 'ENCADREMENT', 'S'),
    ('BENOIST Numa', 'IEG', 'S'),
    ('BENOIST Numa', 'IES', 'P'),
    -- BENSALEM Rafik
    ('BENSALEM Rafik', 'IEG', 'P'),
    -- BERGEOT Marine
    ('BERGEOT Marine', 'ENCADREMENT', 'P'),
    -- BERTAULT Frédéric
    ('BERTAULT Frédéric', 'TRACAGE', 'P'),
    ('BERTAULT Frédéric', 'IEG', 'S'),
    ('BERTAULT Frédéric', 'PACK', 'S'),
    -- BERTHEAU Anthony
    ('BERTHEAU Anthony', 'AUTO', 'S'),
    ('BERTHEAU Anthony', 'PACK', 'P'),
    -- BERTHIER Marwin
    ('BERTHIER Marwin', 'ADMIN', 'P'),
    -- BERTHOUD Ludovic
    ('BERTHOUD Ludovic', 'ROB', 'P'),
    -- BERTRAND Antoine
    ('BERTRAND Antoine', 'IEG', 'P'),
    -- BLASCO Kévin
    ('BLASCO Kévin', 'IEG', 'P'),
    ('BLASCO Kévin', 'RELEVE', 'S'),
    -- BOIS John
    ('BOIS John', 'IEG', 'P'),
    -- BOISSEAU Pascal
    ('BOISSEAU Pascal', 'IEG', 'P'),
    -- BONGIOVANNI F.
    ('BONGIOVANNI F.', 'ADMIN', 'P'),
    -- BOUAOUD KEVIN
    ('BOUAOUD KEVIN', 'IEG', 'P'),
    ('BOUAOUD KEVIN', 'RELEVE', 'S'),
    -- BOULEDJOUDJA Nasser
    ('BOULEDJOUDJA Nasser', 'IEG', 'P'),
    ('BOULEDJOUDJA Nasser', 'K1', 'S'),
    -- BOULINEAU Damien
    ('BOULINEAU Damien', 'IEG', 'P'),
    -- BOURDEAU Mathieu
    ('BOURDEAU Mathieu', 'BE_IES', 'P'),
    ('BOURDEAU Mathieu', 'PREPA', 'S'),
    -- BOURIAL Rachid
    ('BOURIAL Rachid', 'IEG', 'P'),
    -- BOUSSIKHANI Khalid
    ('BOUSSIKHANI Khalid', 'TRACAGE', 'S'),
    ('BOUSSIKHANI Khalid', 'PACK', 'P'),
    -- BOUVET THEO
    ('BOUVET THEO', 'IEG', 'P'),
    ('BOUVET THEO', 'RELEVE', 'S'),
    -- BRUCY Eric
    ('BRUCY Eric', 'IEG', 'P'),
    ('BRUCY Eric', 'REDACTION_RA', 'S'),
    ('BRUCY Eric', 'RELEVE', 'S'),
    -- CADEAU Jérome
    ('CADEAU Jérome', 'IEG', 'P'),
    -- CARRE Steven
    ('CARRE Steven', 'INSTRUM', 'P'),
    ('CARRE Steven', 'PREPA', 'S'),
    -- CATEAU Alexandre
    ('CATEAU Alexandre', 'TRACAGE', 'P'),
    ('CATEAU Alexandre', 'PACK', 'S'),
    -- CENSE Anthony
    ('CENSE Anthony', 'IEG', 'P'),
    ('CENSE Anthony', 'SS4', 'S'),
    -- CHANTEREAU Yoann
    ('CHANTEREAU Yoann', 'HSE_CRP', 'P'),
    -- CHEVRIER Alain
    ('CHEVRIER Alain', 'ENCADREMENT', 'S'),
    ('CHEVRIER Alain', 'IEG', 'P'),
    ('CHEVRIER Alain', 'SS4', 'S'),
    -- CHIRINIAN Philippe
    ('CHIRINIAN Philippe', 'ENCADREMENT', 'P'),
    -- CHOISY Matthieu
    ('CHOISY Matthieu', 'IEG', 'S'),
    ('CHOISY Matthieu', 'PACK', 'P'),
    -- CHUDEAU Quentin
    ('CHUDEAU Quentin', 'ENCADREMENT', 'P'),
    ('CHUDEAU Quentin', 'IEG', 'S'),
    ('CHUDEAU Quentin', 'IES', 'S'),
    ('CHUDEAU Quentin', 'PACK', 'S'),
    ('CHUDEAU Quentin', 'PREPA', 'S'),
    -- CLEMENT Lucas
    ('CLEMENT Lucas', 'IEG', 'P'),
    -- COILLIOT Valentin
    ('COILLIOT Valentin', 'IEG', 'P'),
    -- COLLAS Valentin
    ('COLLAS Valentin', 'MAGASIN', 'P'),
    -- CORRECH Chrisitan
    ('CORRECH Chrisitan', 'ENCADREMENT', 'P'),
    -- COUCHOURON Jean Christophe
    ('COUCHOURON Jean Christophe', 'MAGASIN', 'P'),
    -- COURVALET Sébastien
    ('COURVALET Sébastien', 'IEG', 'S'),
    ('COURVALET Sébastien', 'PACK', 'P'),
    -- DAGOUNEAU Jimmy
    ('DAGOUNEAU Jimmy', 'AUTO', 'S'),
    ('DAGOUNEAU Jimmy', 'ENCADREMENT', 'P'),
    ('DAGOUNEAU Jimmy', 'IEG', 'S'),
    ('DAGOUNEAU Jimmy', 'PACK', 'S'),
    ('DAGOUNEAU Jimmy', 'K1', 'S'),
    ('DAGOUNEAU Jimmy', 'ESSAIS', 'S'),
    ('DAGOUNEAU Jimmy', 'RELEVE', 'S'),
    -- DANET Nicolas
    ('DANET Nicolas', 'AUTO', 'S'),
    ('DANET Nicolas', 'IEG', 'P'),
    ('DANET Nicolas', 'PACK', 'S'),
    ('DANET Nicolas', 'K1', 'S'),
    ('DANET Nicolas', 'ESSAIS', 'S'),
    -- DAVID Douglas
    ('DAVID Douglas', 'BE_IES', 'P'),
    ('DAVID Douglas', 'PREPA', 'S'),
    -- DAVID Jordan
    ('DAVID Jordan', 'IEG', 'S'),
    ('DAVID Jordan', 'SS4', 'P'),
    -- DEAGOSTINI Logan
    ('DEAGOSTINI Logan', 'AUTO', 'S'),
    ('DEAGOSTINI Logan', 'IEG', 'S'),
    ('DEAGOSTINI Logan', 'PACK', 'P'),
    ('DEAGOSTINI Logan', 'K1', 'S'),
    -- DEFORGES MICKAEL
    ('DEFORGES MICKAEL', 'IEG', 'P'),
    -- DELABY Steven
    ('DELABY Steven', 'IES', 'P'),
    -- DELAIGUE Luc
    ('DELAIGUE Luc', 'AUTO', 'S'),
    ('DELAIGUE Luc', 'IEG', 'P'),
    -- DELNOMDEDIEU Yoann
    ('DELNOMDEDIEU Yoann', 'MAGASIN', 'P'),
    -- DELORME CERISIER Cédric
    ('DELORME CERISIER Cédric', 'IEG', 'P'),
    -- DEMESTRE Steven
    ('DEMESTRE Steven', 'IEG', 'P'),
    -- DEMICHELIS Thomas
    ('DEMICHELIS Thomas', 'IEG', 'P'),
    -- DESCHAMPS Guillaume
    ('DESCHAMPS Guillaume', 'IEG', 'P'),
    ('DESCHAMPS Guillaume', 'RELEVE', 'S'),
    -- DEVANNE Hubert
    ('DEVANNE Hubert', 'IEG', 'P'),
    -- DEZE Erika
    ('DEZE Erika', 'ADMIN', 'P'),
    -- DIDIER Sullivan
    ('DIDIER Sullivan', 'IEG', 'P'),
    -- DROUOT Vincent
    ('DROUOT Vincent', 'PREPA', 'P'),
    -- DUBOIS Nathan
    ('DUBOIS Nathan', 'IEG', 'P'),
    -- DUMETZ Kévin
    ('DUMETZ Kévin', 'IEG', 'P'),
    -- DUPUY Alain
    ('DUPUY Alain', 'ENCADREMENT', 'P'),
    -- DUTEMPLE Sullyvan
    ('DUTEMPLE Sullyvan', 'IEG', 'P'),
    -- EDOLFI Didier
    ('EDOLFI Didier', 'IEG', 'P'),
    ('EDOLFI Didier', 'K1', 'S'),
    -- EL MOURABIT Saïd
    ('EL MOURABIT Saïd', 'PACK', 'P'),
    -- ESCAFIT Bastien
    ('ESCAFIT Bastien', 'IEG', 'P'),
    -- FARJAUDOU Alexandra
    ('FARJAUDOU Alexandra', 'IEG', 'P'),
    -- FAUVELLE Julien
    ('FAUVELLE Julien', 'ENCADREMENT', 'P'),
    -- FOLIARD Clement
    ('FOLIARD Clement', 'IES', 'S'),
    ('FOLIARD Clement', 'INSTRUM', 'P'),
    -- FONTAINE Tim
    ('FONTAINE Tim', 'IEG', 'P'),
    -- FOUBERT Enzo
    ('FOUBERT Enzo', 'IEG', 'P'),
    -- FOUCHER Félicie
    ('FOUCHER Félicie', 'IEG', 'P'),
    -- FOUCHER Melodie
    ('FOUCHER Melodie', 'PREPA', 'P'),
    -- FOULON Thomas
    ('FOULON Thomas', 'IEG', 'S'),
    ('FOULON Thomas', 'SS4', 'P'),
    -- GALLET Arnaud
    ('GALLET Arnaud', 'ENCADREMENT', 'P'),
    ('GALLET Arnaud', 'IEG', 'S'),
    ('GALLET Arnaud', 'RELEVE', 'S'),
    -- GARDERA Nicolas
    ('GARDERA Nicolas', 'IEG', 'P'),
    -- GARDERA Richard
    ('GARDERA Richard', 'PACK', 'P'),
    -- GERVIER Quentin
    ('GERVIER Quentin', 'BE_IES', 'P'),
    ('GERVIER Quentin', 'PREPA', 'S'),
    -- GIBEAU Matthis
    ('GIBEAU Matthis', 'IEG', 'P'),
    -- GIUGLAR Jean-luc
    ('GIUGLAR Jean-luc', 'IEG', 'P'),
    -- GODINEAU André
    ('GODINEAU André', 'PACK', 'P'),
    -- GRANDJEAN Maxime
    ('GRANDJEAN Maxime', 'PACK', 'P'),
    ('GRANDJEAN Maxime', 'PREPA', 'S'),
    -- GRATIA Jason
    ('GRATIA Jason', 'ENCADREMENT', 'P'),
    ('GRATIA Jason', 'INSTRUM', 'S'),
    -- GUILLET Nicolas
    ('GUILLET Nicolas', 'IEG', 'S'),
    ('GUILLET Nicolas', 'PACK', 'P'),
    -- HAMMAMI Lotfi
    ('HAMMAMI Lotfi', 'PACK', 'P'),
    -- HAMMI Sofiane
    ('HAMMI Sofiane', 'IEG', 'P'),
    -- HECHT Mathieu
    ('HECHT Mathieu', 'ENCADREMENT', 'P'),
    -- HENUSET Kevin
    ('HENUSET Kevin', 'IEG', 'P'),
    -- HEU Tong
    ('HEU Tong', 'IEG', 'P'),
    -- JARRY Yohann
    ('JARRY Yohann', 'IEG', 'P'),
    -- JUCQUOIS Cyril
    ('JUCQUOIS Cyril', 'IEG', 'S'),
    ('JUCQUOIS Cyril', 'IES', 'S'),
    ('JUCQUOIS Cyril', 'PACK', 'P'),
    ('JUCQUOIS Cyril', 'PREPA', 'S'),
    -- KLIN Tony
    ('KLIN Tony', 'IEG', 'P'),
    -- LA VILLE Aurélia
    ('LA VILLE Aurélia', 'SERVITUDE', 'P'),
    ('LA VILLE Aurélia', 'REDACTION_RA', 'S'),
    -- LAFAGE Gabin
    ('LAFAGE Gabin', 'IEG', 'P'),
    ('LAFAGE Gabin', 'SS4', 'S'),
    -- LAFON Olivier
    ('LAFON Olivier', 'IEG', 'P'),
    ('LAFON Olivier', 'RELEVE', 'S'),
    -- LAFON Sébastien
    ('LAFON Sébastien', 'ENCADREMENT', 'P'),
    ('LAFON Sébastien', 'PREPA', 'S'),
    -- LASALLE Laurent
    ('LASALLE Laurent', 'IEG', 'P'),
    ('LASALLE Laurent', 'RELEVE', 'S'),
    -- LASSALLE Marie
    ('LASSALLE Marie', 'PREPA', 'S'),
    ('LASSALLE Marie', 'SERVITUDE', 'S'),
    ('LASSALLE Marie', 'REDACTION_RA', 'P'),
    -- LE CALVEZ Denis
    ('LE CALVEZ Denis', 'IEG', 'S'),
    ('LE CALVEZ Denis', 'ESSAIS', 'P'),
    -- LE COMPAS Vincent
    ('LE COMPAS Vincent', 'IES', 'P'),
    -- LEBEAU Christian
    ('LEBEAU Christian', 'IEG', 'S'),
    ('LEBEAU Christian', 'PACK', 'P'),
    -- LECLERCQ Christophe
    ('LECLERCQ Christophe', 'ENCADREMENT', 'P'),
    -- LEDUC Dylan
    ('LEDUC Dylan', 'PACK', 'P'),
    -- LEGER Fabrice
    ('LEGER Fabrice', 'ENCADREMENT', 'P'),
    ('LEGER Fabrice', 'IEG', 'S'),
    ('LEGER Fabrice', 'ESSAIS', 'S'),
    -- LESIEUX Sidoine
    ('LESIEUX Sidoine', 'IEG', 'S'),
    ('LESIEUX Sidoine', 'RELEVE', 'P'),
    -- LILA Papa Mor
    ('LILA Papa Mor', 'IEG', 'P'),
    -- LOIRAT Michel
    ('LOIRAT Michel', 'ENCADREMENT', 'P'),
    -- LORENZO Guillaume
    ('LORENZO Guillaume', 'PACK', 'P'),
    -- LY Eric
    ('LY Eric', 'IES', 'S'),
    ('LY Eric', 'PACK', 'P'),
    ('LY Eric', 'FIBRE OPTIQUE', 'S'),
    -- LY Tsou Tchia
    ('LY Tsou Tchia', 'IES', 'S'),
    ('LY Tsou Tchia', 'PACK', 'P'),
    -- MANDOT Angi
    ('MANDOT Angi', 'IEG', 'P'),
    -- MANDOT Jason
    ('MANDOT Jason', 'IEG', 'P'),
    -- MARCHET Stéphane
    ('MARCHET Stéphane', 'IEG', 'P'),
    -- MARIN Léo
    ('MARIN Léo', 'IEG', 'P'),
    -- MARSEILLE Jean Philippe
    ('MARSEILLE Jean Philippe', 'PREPA', 'P'),
    -- MARTINS Nicolas
    ('MARTINS Nicolas', 'PREPA', 'P'),
    -- MASSAT Jean-Didier
    ('MASSAT Jean-Didier', 'PREPA', 'P'),
    -- MAYELE Oleo
    ('MAYELE Oleo', 'IEG', 'P'),
    -- MEFTAH Imed
    ('MEFTAH Imed', 'AUTO', 'S'),
    ('MEFTAH Imed', 'IEG', 'P'),
    -- MEKKID Oualid
    ('MEKKID Oualid', 'IEG', 'P'),
    ('MEKKID Oualid', 'ESSAIS', 'S'),
    ('MEKKID Oualid', 'RELEVE', 'S'),
    -- MENARD Adrien
    ('MENARD Adrien', 'IES', 'P'),
    -- MENDES Armano
    ('MENDES Armano', 'IEG', 'P'),
    -- MENERO Tédy
    ('MENERO Tédy', 'IEG', 'P'),
    -- MESSAOUDI Samir
    ('MESSAOUDI Samir', 'IEG', 'P'),
    -- MIEULET Franck
    ('MIEULET Franck', 'IEG', 'S'),
    ('MIEULET Franck', 'INSTRUM', 'S'),
    ('MIEULET Franck', 'PACK', 'P'),
    ('MIEULET Franck', 'FIBRE OPTIQUE', 'S'),
    -- MOREAU Benoit
    ('MOREAU Benoit', 'PACK', 'P'),
    -- MOREAU Joël
    ('MOREAU Joël', 'TRACAGE', 'P'),
    -- MOTARD Frederic
    ('MOTARD Frederic', 'IEG', 'S'),
    ('MOTARD Frederic', 'ESSAIS', 'P'),
    -- MOUILLON Remy
    ('MOUILLON Remy', 'IES', 'P'),
    -- NAIMI Laïd
    ('NAIMI Laïd', 'ENCADREMENT', 'P'),
    -- NDIAYE Cheikh
    ('NDIAYE Cheikh', 'IEG', 'P'),
    -- NERON Jean-francois
    ('NERON Jean-francois', 'AUTO', 'P'),
    ('NERON Jean-francois', 'IEG', 'S'),
    -- PACHNOPOULOS Naome
    ('PACHNOPOULOS Naome', 'ADMIN', 'P'),
    -- PASDELOUP Joseph
    ('PASDELOUP Joseph', 'IEG', 'P'),
    -- PASQUIER Pascal
    ('PASQUIER Pascal', 'IEG', 'P'),
    -- PASTRE Mathis
    ('PASTRE Mathis', 'IEG', 'P'),
    -- PATUREAU Tiffany
    ('PATUREAU Tiffany', 'IEG', 'P'),
    -- PENOT Robin
    ('PENOT Robin', 'IEG', 'P'),
    ('PENOT Robin', 'INSTRUM', 'S'),
    -- PERRIN Julien
    ('PERRIN Julien', 'ENCADREMENT', 'P'),
    ('PERRIN Julien', 'PREPA', 'S'),
    -- PERRIN Nathan
    ('PERRIN Nathan', 'IEG', 'P'),
    -- PESQUEREL Noémie
    ('PESQUEREL Noémie', 'ADMIN', 'P'),
    -- PETIT Sarah
    ('PETIT Sarah', 'ADMIN', 'P'),
    -- PILLARD Alexandre
    ('PILLARD Alexandre', 'BE_IES', 'P'),
    ('PILLARD Alexandre', 'PREPA', 'S'),
    -- PITAULT Christophe
    ('PITAULT Christophe', 'AUTO', 'P'),
    -- POUSSE Charles
    ('POUSSE Charles', 'IEG', 'S'),
    ('POUSSE Charles', 'SS4', 'P'),
    -- PRIEUR Claude -Henri
    ('PRIEUR Claude -Henri', 'PREPA', 'P'),
    -- PRIMASE Valentin
    ('PRIMASE Valentin', 'IEG', 'P'),
    -- PROUST Lucas
    ('PROUST Lucas', 'IEG', 'S'),
    ('PROUST Lucas', 'PACK', 'P'),
    -- RMILI Omar
    ('RMILI Omar', 'IEG', 'P'),
    ('RMILI Omar', 'ESSAIS', 'S'),
    ('RMILI Omar', 'RELEVE', 'S'),
    -- ROBERT David
    ('ROBERT David', 'IEG', 'P'),
    -- ROBINET Mickael
    ('ROBINET Mickael', 'IEG', 'P'),
    -- ROBLIN Julien
    ('ROBLIN Julien', 'IEG', 'P'),
    -- ROL Pascal
    ('ROL Pascal', 'IEG', 'P'),
    ('ROL Pascal', 'INSTRUM', 'S'),
    -- ROULEAU Maxence
    ('ROULEAU Maxence', 'PREPA', 'P'),
    -- ROUZIES Julien
    ('ROUZIES Julien', 'PREPA', 'P'),
    ('ROUZIES Julien', 'ESSAIS', 'S'),
    ('ROUZIES Julien', 'RELEVE', 'S'),
    -- ROY Bernard
    ('ROY Bernard', 'IEG', 'S'),
    ('ROY Bernard', 'RELEVE', 'P'),
    -- ROY Jean Francois
    ('ROY Jean Francois', 'AUTO', 'S'),
    ('ROY Jean Francois', 'IEG', 'P'),
    ('ROY Jean Francois', 'PACK', 'S'),
    ('ROY Jean Francois', 'K1', 'S'),
    ('ROY Jean Francois', 'RELEVE', 'S'),
    -- ROY Maximilien
    ('ROY Maximilien', 'IEG', 'P'),
    -- SALIN Florian
    ('SALIN Florian', 'ADMIN', 'P'),
    -- SAVARY Guilhem
    ('SAVARY Guilhem', 'IEG', 'P'),
    -- SEILLER Steven
    ('SEILLER Steven', 'AUTO', 'P'),
    -- SERPEBOIS Anis
    ('SERPEBOIS Anis', 'IEG', 'P'),
    -- SEVILLE Stephanie
    ('SEVILLE Stephanie', 'IEG', 'S'),
    ('SEVILLE Stephanie', 'IES', 'S'),
    ('SEVILLE Stephanie', 'INSTRUM', 'S'),
    ('SEVILLE Stephanie', 'PACK', 'S'),
    ('SEVILLE Stephanie', 'FIBRE OPTIQUE', 'P'),
    -- SISSOKO PECHON Lenny
    ('SISSOKO PECHON Lenny', 'TRACAGE', 'P'),
    ('SISSOKO PECHON Lenny', 'PACK', 'S'),
    -- SLIMANI Kheireddine
    ('SLIMANI Kheireddine', 'IEG', 'P'),
    ('SLIMANI Kheireddine', 'ESSAIS', 'S'),
    ('SLIMANI Kheireddine', 'RELEVE', 'S'),
    -- STIEVENARD Paul
    ('STIEVENARD Paul', 'IEG', 'P'),
    -- STOPYRA Françoise
    ('STOPYRA Françoise', 'ADMIN', 'P'),
    -- TESSIER Nicolas
    ('TESSIER Nicolas', 'IES', 'P'),
    -- TESSIER Quentin
    ('TESSIER Quentin', 'IEG', 'P'),
    -- THAVENET Alain
    ('THAVENET Alain', 'IEG', 'P'),
    ('THAVENET Alain', 'RELEVE', 'S'),
    -- THOR Jérome
    ('THOR Jérome', 'PACK', 'P'),
    ('THOR Jérome', 'PREPA', 'S'),
    -- TOULLEC Matthieu
    ('TOULLEC Matthieu', 'HSE_CRP', 'P'),
    -- TOURNIER Antoine
    ('TOURNIER Antoine', 'ENCADREMENT', 'P'),
    -- VANG Nou
    ('VANG Nou', 'PACK', 'P'),
    -- VATAN Antonin
    ('VATAN Antonin', 'IEG', 'P'),
    -- VERRON Denis
    ('VERRON Denis', 'IEG', 'P'),
    -- VIDEAU Vincent
    ('VIDEAU Vincent', 'IEG', 'P'),
    -- VIGNALS Remy
    ('VIGNALS Remy', 'IEG', 'P'),
    -- WEPSIEC Elsa
    ('WEPSIEC Elsa', 'HSE_CRP', 'P'),
    -- XIONG Mathis
    ('XIONG Mathis', 'IEG', 'P'),
    -- ZANCHI Lény
    ('ZANCHI Lény', 'IEG', 'P')
) AS comp_data(nom_prenom, competence, type_comp)
INNER JOIN ressources r ON r.nom = comp_data.nom_prenom
WHERE NOT EXISTS (
  SELECT 1 
  FROM ressources_competences rc 
  WHERE rc.ressource_id = r.id 
    AND rc.competence = comp_data.competence
);

COMMIT;
