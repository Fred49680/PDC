INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BELLEVILLE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'APPELBAUM Vianney'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BELLEVILLE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'AUFRERE Didier'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'TRACAGE',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BERTAULT FrÃ©dÃ©ric'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'PACK',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BERTHEAU Anthony'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BERTRAND Antoine'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'GOLFECH',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'ADMIN',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BONGIOVANNI F.'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'SERRURERIE',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BOULINEAU Damien'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'PACK',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BOUSSIKHANI Khalid'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'INSTRUM',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'CARRE Steven'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'GOLFECH',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'CHEVRIER Alain'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BELLEVILLE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'PACK',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'CHOISY Matthieu'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'ENCADREMENT',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'CHUDEAU Quentin'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'CLEMENT Lucas'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'GOLFECH',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'ENCADREMENT',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'CORRECH Chrisitan'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BELLEVILLE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'ENCADREMENT',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'DAGOUNEAU Jimmy'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BELLEVILLE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'PACK',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'DEAGOSTINI Logan'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BELLEVILLE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'PREPA',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'DROUOT Vincent'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'GOLFECH',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'ESCAFIT Bastien'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'INSTRUM',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'FOLIARD Clement'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'PACK',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'GARDERA Richard'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'PACK',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'GODINEAU AndrÃ©'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-02'::date,
    '2026-01-05'::date,
    'CP',
    'ENCADREMENT',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'HECHT Mathieu'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-05'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'PACK',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'JUCQUOIS Cyril'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'GOLFECH',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'LAFAGE Gabin'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'TRACAGE',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'LESIEUX Sidoine'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'MARIN LÃ©o'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'GOLFECH',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'PREPA',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'MASSAT Jean-Didier'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BELLEVILLE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'MEFTAH Imed'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'GOLFECH',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'MEKKID Oualid'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'MENDES Armano'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'GOLFECH',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'MENERO TÃ©dy'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'SAINT-LAURENT',
    '2026-01-02'::date,
    '2026-01-04'::date,
    'CP',
    'PACK',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'MIEULET Franck'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-04'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'PACK',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'MOREAU Benoit'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'NDIAYE Cheikh'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'PASQUIER Pascal'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'PATUREAU Tiffany'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'AUTO',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'PITAULT Christophe'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'PACK',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'PROUST Lucas'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'ROBERT David'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'ROL Pascal'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'GOLFECH',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'PREPA',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'ROUZIES Julien'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BELLEVILLE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'ROY Jean Francois'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-05'::date,
    'CP',
    'FIBRE OPTIQUE',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'SEVILLE Stephanie'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-05'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'STIEVENARD Paul'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'VATAN Antonin'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-02-16'::date,
    '2026-02-20'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'CLEMENT Lucas'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-02-16'::date 
    AND a.date_fin = '2026-02-20'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-02-20'::date,
    '2026-02-24'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'DUMETZ Kevin'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-02-20'::date 
    AND a.date_fin = '2026-02-24'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-04-13'::date,
    '2026-04-17'::date,
    'CP',
    'PACK',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'THOR JÃ©rome'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-04-13'::date 
    AND a.date_fin = '2026-04-17'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-01'::date,
    '2026-02-28'::date,
    'CONGÃ‰ PARENTAL',
    'ADMIN',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'PACHNOPOULOS Naome'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-01'::date 
    AND a.date_fin = '2026-02-28'::date
    AND a.type = 'CONGÃ‰ PARENTAL'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-13'::date,
    '2026-01-16'::date,
    'FORMATION',
    'IEG',
    'Initiale RP2 - Trihom Reignac',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'MARIN LÃ©o'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-13'::date 
    AND a.date_fin = '2026-01-16'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-12'::date,
    '2026-01-20'::date,
    'CP',
    'PACK',
    'en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'HAMMAMI Lotfi'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-12'::date 
    AND a.date_fin = '2026-01-20'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-26'::date,
    '2025-12-26'::date,
    'CP',
    'PACK',
    'en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'MOREAU Benoit'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-26'::date 
    AND a.date_fin = '2025-12-26'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-29'::date,
    '2026-01-02'::date,
    'CP',
    'PACK',
    'en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'THOR JÃ©rome'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-29'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-26'::date,
    '2025-12-26'::date,
    'CP',
    'PACK',
    'en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'GRANDJEAN Maxime'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-26'::date 
    AND a.date_fin = '2025-12-26'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-26'::date,
    '2026-01-02'::date,
    'CP',
    'PACK',
    'en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BERTHEAU Anthony'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-26'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-26'::date,
    '2026-01-04'::date,
    'CP',
    'IEG',
    'en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'VERRON Denis'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-26'::date 
    AND a.date_fin = '2026-01-04'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-26'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    'en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'ROBLIN Julien'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-26'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-29'::date,
    '2026-01-02'::date,
    'CP',
    'IES',
    'en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'TESSIER Nicolas'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-29'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    'en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'FOULON Thomas'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    'en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'PASTRE Mathis'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    'en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'FOUBERT Enzo'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-26'::date,
    '2025-12-26'::date,
    'CP',
    'IEG',
    'en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'FARJAUDOU Alexandra'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-26'::date 
    AND a.date_fin = '2025-12-26'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    'en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'FARJAUDOU Alexandra'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'GOLFECH',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    'en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'DANET Nicolas'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'SAVIGNY',
    '2026-01-05'::date,
    '2026-01-06'::date,
    'FORMATION',
    'ENCADREMENT',
    'Recyclage RP1 - Trihom Ouzouer',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BARBEROT Matthieu'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-05'::date 
    AND a.date_fin = '2026-01-06'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-07'::date,
    '2026-01-08'::date,
    'FORMATION',
    'PACK',
    'Recyclage RP2 - Trihom Ouzouer',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'GARDERA Richard'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-07'::date 
    AND a.date_fin = '2026-01-08'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-05'::date,
    '2026-01-16'::date,
    'CP',
    'PREPA',
    'Saisi par Sarah - en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'ROULEAU Maxence'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-05'::date 
    AND a.date_fin = '2026-01-16'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-05'::date,
    '2026-01-09'::date,
    'CP',
    'IEG',
    'Saisi par Sarah - en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BRUCY Eric'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-05'::date 
    AND a.date_fin = '2026-01-09'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-26'::date,
    '2025-12-26'::date,
    'CP',
    'IEG',
    'En attente validation',
    'Non',
    '2025-12-15 07:13:13'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'DUMETZ Kevin'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-26'::date 
    AND a.date_fin = '2025-12-26'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-22'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    'Saisi par Sarah - en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'LILA Papa Mor'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-22'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2025-12-22'::date,
    '2026-01-02'::date,
    'CP',
    'SERRURERIE',
    'Saisi par Sarah - en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'VIDEAU Vincent'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-22'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-29'::date,
    '2026-01-02'::date,
    'CP',
    'SS4',
    'Saisi par Sarah - en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'POUSSE Charles'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-29'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-29'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    'Saisi par Sarah - en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'ABDELHAKK Mourad'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-29'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-17'::date,
    '2026-01-02'::date,
    'CP',
    'SERRURERIE',
    'Saisi par Sarah - en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'DAVID Jordan'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-17'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'PACK',
    'Saisi par Sarah - en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'GUILLET Nicolas'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2025-12-22'::date,
    '2026-01-01'::date,
    'CP',
    'IES',
    'Saisi par LaÃ¯d - en attente de validation admin',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BENOIST Numa'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-22'::date 
    AND a.date_fin = '2026-01-01'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-19'::date,
    '2026-01-20'::date,
    'FORMATION',
    'IEG',
    'CSQ',
    'Non',
    '2025-12-09 00:00:00'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BENSALEM Rafik'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-19'::date 
    AND a.date_fin = '2026-01-20'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-02-18'::date,
    '2026-02-19'::date,
    'FORMATION',
    'IEG',
    'RP2',
    'Non',
    '2025-12-09 00:00:00'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BENSALEM Rafik'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-02-18'::date 
    AND a.date_fin = '2026-02-19'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-29'::date,
    '2026-01-29'::date,
    'VM',
    NULL,
    'ValidÃ© par arnaud.gallet le 11/12/2025 11:47',
    'Oui',
    '2025-12-11 11:46:19'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'DEMICHELIS Thomas'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-29'::date 
    AND a.date_fin = '2026-01-29'::date
    AND a.type = 'VM'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IES',
    'En attente validation',
    'Non',
    '2025-12-12 09:15:43'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'MOUILLON Remy'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-22'::date,
    '2026-01-02'::date,
    'CP',
    'AUTO',
    'En attente validation',
    'Non',
    '2025-12-15 07:10:31'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'PITAULT Christophe'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-22'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-31'::date,
    '2026-01-05'::date,
    'CP',
    'IEG',
    'En attente validation',
    'Non',
    '2025-12-15 07:12:13'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'HEU Tong'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-31'::date 
    AND a.date_fin = '2026-01-05'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    'En attente validation',
    'Non',
    '2025-12-15 07:13:53'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'DUMETZ Kevin'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-02-23'::date,
    '2026-03-01'::date,
    'CP',
    'AUTO',
    'En attente validation',
    'Non',
    '2025-12-15 07:14:38'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'SEILLER Steven'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-02-23'::date 
    AND a.date_fin = '2026-03-01'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-26'::date,
    '2025-12-26'::date,
    'CP',
    'PACK',
    'En attente validation',
    'Non',
    '2025-12-15 07:15:44'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BOUSSIKHANI Khalid'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-26'::date 
    AND a.date_fin = '2025-12-26'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'TESSIER Quentin'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2025-12-26'::date,
    '2025-12-26'::date,
    'CP',
    'IEG',
    'En attente validation',
    'Non',
    '2025-12-15 12:58:23'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'VIGNALS Remy'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-26'::date 
    AND a.date_fin = '2025-12-26'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-19'::date,
    '2025-12-19'::date,
    'CP',
    'IEG',
    'En attente validation',
    'Non',
    '2025-12-15 12:59:16'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'DUMETZ Kevin'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-19'::date 
    AND a.date_fin = '2025-12-19'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-16'::date,
    '2025-12-18'::date,
    'CP',
    'AUTO',
    'En attente validation',
    'Non',
    '2025-12-15 13:00:00'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'PITAULT Christophe'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-16'::date 
    AND a.date_fin = '2025-12-18'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-31'::date,
    '2025-12-31'::date,
    'CP',
    'IEG',
    'En attente validation',
    'Non',
    '2025-12-15 15:53:42'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'GARDERA Nicolas'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-31'::date 
    AND a.date_fin = '2025-12-31'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2026-01-02'::date,
    '2026-01-04'::date,
    'CP',
    'IEG',
    'En attente validation',
    'Non',
    '2025-12-15 15:54:28'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'PASTRE Mathis'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-04'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'DAMPIERRE',
    '2025-12-19'::date,
    '2025-12-28'::date,
    'CP',
    'IEG',
    'En attente validation',
    'Non',
    '2025-12-15 15:56:58'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'PASTRE Mathis'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-19'::date 
    AND a.date_fin = '2025-12-28'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-21'::date,
    '2026-01-22'::date,
    'FORMATION',
    'ENCADREMENT',
    'Recyclage RP2 - Trihom Reignac',
    'Non',
    '2025-12-16 08:02:50'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BERGEOT Marine'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-21'::date 
    AND a.date_fin = '2026-01-22'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-21'::date,
    '2026-01-22'::date,
    'FORMATION',
    'SERRURERIE',
    'Recyclage RP2 - Trihom Reignac',
    'Non',
    '2025-12-16 08:02:50'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'DEFORGES MICKAEL'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-21'::date 
    AND a.date_fin = '2026-01-22'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'GOLFECH',
    '2026-02-02'::date,
    '2026-02-03'::date,
    'FORMATION',
    'PREPA',
    'Recyclage RP2 - Trihom Valence d''Agen',
    'Non',
    '2025-12-16 08:02:50'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'ROUZIES Julien'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-02-02'::date 
    AND a.date_fin = '2026-02-03'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'GOLFECH',
    '2026-01-14'::date,
    '2026-01-14'::date,
    'FORMATION',
    'ENCADREMENT',
    'HN3 - Trihom Reignac',
    'Non',
    '2025-12-16 08:02:50'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'PERRIN Julien'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-14'::date 
    AND a.date_fin = '2026-01-14'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'GOLFECH',
    '2026-01-14'::date,
    '2026-01-14'::date,
    'FORMATION',
    'PREPA',
    'HN3 - Trihom Reignac',
    'Non',
    '2025-12-16 08:02:50'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'ROUZIES Julien'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-14'::date 
    AND a.date_fin = '2026-01-14'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-14'::date,
    '2026-01-14'::date,
    'FORMATION',
    'HSE_CRP',
    'HN3 - Trihom Reignac',
    'Non',
    '2025-12-16 08:02:50'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'TOULLEC Matthieu'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-14'::date 
    AND a.date_fin = '2026-01-14'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-14'::date,
    '2026-01-15'::date,
    'FORMATION',
    'IEG',
    'Recyclage Electrique - Apave Artigues Pres Bordeaux',
    'Non',
    '2025-12-17 09:30:46'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'RMILI Omar'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-14'::date 
    AND a.date_fin = '2026-01-15'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'GOLFECH',
    '2026-03-04'::date,
    '2026-03-04'::date,
    'FORMATION',
    'IEG',
    'Recyclage Culture SÃ»retÃ© - De 10H Ã  12H - CNPE Blayais',
    'Non',
    '2025-12-17 13:20:00'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'CENSE Anthony'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-03-04'::date 
    AND a.date_fin = '2026-03-04'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-03-04'::date,
    '2026-03-04'::date,
    'FORMATION',
    'MAGASIN',
    'Recyclage Culture SÃ»retÃ© - De 10H Ã  12H - CNPE Blayais',
    'Non',
    '2025-12-17 13:20:00'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'DELNOMDEDIEU Yoann'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-03-04'::date 
    AND a.date_fin = '2026-03-04'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-03-04'::date,
    '2026-03-04'::date,
    'FORMATION',
    'IEG',
    'Recyclage Culture SÃ»retÃ© - De 10H Ã  12H - CNPE Blayais',
    'Non',
    '2025-12-17 13:20:00'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'EDOLFI Didier'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-03-04'::date 
    AND a.date_fin = '2026-03-04'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-03-04'::date,
    '2026-03-04'::date,
    'FORMATION',
    'ENCADREMENT',
    'Recyclage Culture SÃ»retÃ© - De 10H Ã  12H - CNPE Blayais',
    'Non',
    '2025-12-17 13:20:00'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'GALLET Arnaud'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-03-04'::date 
    AND a.date_fin = '2026-03-04'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-03-04'::date,
    '2026-03-04'::date,
    'FORMATION',
    'ENCADREMENT',
    'Recyclage Culture SÃ»retÃ© - De 10H Ã  12H - CNPE Blayais',
    'Non',
    '2025-12-17 13:20:00'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'HECHT Mathieu'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-03-04'::date 
    AND a.date_fin = '2026-03-04'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-03-04'::date,
    '2026-03-04'::date,
    'FORMATION',
    'IEG',
    'Recyclage Culture SÃ»retÃ© - De 10H Ã  12H - CNPE Blayais',
    'Non',
    '2025-12-17 13:20:00'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'LAFON Olivier'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-03-04'::date 
    AND a.date_fin = '2026-03-04'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-03-04'::date,
    '2026-03-04'::date,
    'FORMATION',
    'ENCADREMENT',
    'Recyclage Culture SÃ»retÃ© - De 10H Ã  12H - CNPE Blayais',
    'Non',
    '2025-12-17 13:20:00'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'LAFON SÃ©bastien'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-03-04'::date 
    AND a.date_fin = '2026-03-04'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-26'::date,
    '2026-01-26'::date,
    'FORMATION',
    'IEG',
    'epi',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'SAGLAM Ibrahim'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-26'::date 
    AND a.date_fin = '2026-01-26'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-06'::date,
    '2026-01-06'::date,
    'FORMATION',
    'IEG',
    'travaux en hauteur',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'SAGLAM Ibrahim'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-06'::date 
    AND a.date_fin = '2026-01-06'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-02-03'::date,
    '2026-02-03'::date,
    'FORMATION',
    'IEG',
    'HT',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'SAGLAM Ibrahim'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-02-03'::date 
    AND a.date_fin = '2026-02-03'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2025-02-16'::date,
    '2025-02-17'::date,
    'FORMATION',
    'IEG',
    'BT',
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'SAGLAM Ibrahim'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-02-16'::date 
    AND a.date_fin = '2025-02-17'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2025-12-24'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'SLIMANI Kheireddine'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2025-12-24'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-02-09'::date,
    '2026-02-13'::date,
    'CP',
    'RELEVE',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BOUVET THEO'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-02-09'::date 
    AND a.date_fin = '2026-02-13'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'RELEVE',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BOUVET THEO'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BLASCO KÃ©vin'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'SERRURERIE',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'CADEAU JÃ©rome'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'ESSAIS',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'MOTARD Frederic'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'HSE_CRP',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'TOULLEC Matthieu'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-07-13'::date,
    '2026-07-24'::date,
    'CP',
    'IEG',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'EDOLFI Didier'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-07-13'::date 
    AND a.date_fin = '2026-07-24'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'ENCADREMENT',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'GALLET Arnaud'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'ENCADREMENT',
    NULL,
    'Non',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'LEGER Fabrice'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-05'::date,
    '2026-01-30'::date,
    'CP',
    'PACK',
    'En attente validation',
    'Non',
    '2025-12-19 08:38:24'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'LY Tsou Tchia'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-05'::date 
    AND a.date_fin = '2026-01-30'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-14'::date,
    '2026-02-12'::date,
    'MALADIE',
    'ENCADREMENT',
    'En attente validation',
    'Non',
    '2025-12-19 08:39:19'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'CHUDEAU Quentin'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-14'::date 
    AND a.date_fin = '2026-02-12'::date
    AND a.type = 'MALADIE'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-02-16'::date,
    '2026-02-20'::date,
    'CP',
    'TRACAGE',
    'En attente validation',
    'Non',
    '2025-12-19 08:40:17'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'CATEAU Alexandre'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-02-16'::date 
    AND a.date_fin = '2026-02-20'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'TRACAGE',
    'En attente validation',
    'Non',
    '2025-12-19 08:41:04'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'BERTAULT FrÃ©dÃ©ric'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'ENCADREMENT',
    'En attente validation',
    'Non',
    '2025-12-19 08:41:32'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'CHUDEAU Quentin'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'PACK',
    'En attente validation',
    'Non',
    '2025-12-19 08:42:10'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'JUCQUOIS Cyril'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'SAINT-LAURENT',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'PACK',
    'En attente validation',
    'Non',
    '2025-12-19 08:42:56'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'MIEULET Franck'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'PACK',
    'En attente validation',
    'Non',
    '2025-12-19 08:43:29'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'PROUST Lucas'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'FIBRE OPTIQUE',
    'En attente validation',
    'Non',
    '2025-12-19 08:43:59'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'SEVILLE Stephanie'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'INSTRUM',
    'En attente validation',
    'Non',
    '2025-12-19 08:53:03'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'FOLIARD Clement'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'IEG',
    'En attente validation',
    'Non',
    '2025-12-19 08:53:44'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'ROL Pascal'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'CHINON',
    '2026-01-02'::date,
    '2026-01-02'::date,
    'CP',
    'TRACAGE',
    'En attente validation',
    'Non',
    '2025-12-19 08:54:14'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'SISSOKO PECHON Lenny'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-02'::date 
    AND a.date_fin = '2026-01-02'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-02-02'::date,
    '2026-02-02'::date,
    'FORMATION',
    'IEG',
    'CHEVILLAGE - ValidÃ© par mathieu.hecht le 22/12/2025 07:14',
    'Oui',
    NOW()::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'AKTAS Melih'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-02-02'::date 
    AND a.date_fin = '2026-02-02'::date
    AND a.type = 'FORMATION'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-05'::date,
    '2026-01-16'::date,
    'CP',
    'IEG',
    'ValidÃ© par mathieu.hecht le 22/12/2025 10:39',
    'Oui',
    '2025-12-22 10:39:04'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'YAHYAOUI Hamid'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-05'::date 
    AND a.date_fin = '2026-01-16'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-09'::date,
    '2026-01-15'::date,
    'CP',
    'IEG',
    'ValidÃ© par antoine.tournier le 22/12/2025 15:22',
    'Oui',
    '2025-12-22 15:22:43'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'RIFFI ABED Yacine'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-09'::date 
    AND a.date_fin = '2026-01-15'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'GOLFECH',
    '2026-01-19'::date,
    '2026-01-26'::date,
    'CP',
    'ENCADREMENT',
    'ValidÃ© par fabienne.bongiovanni le 23/12/2025 10:06',
    'Oui',
    '2025-12-23 10:06:29'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'PERRIN Julien'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-19'::date 
    AND a.date_fin = '2026-01-26'::date
    AND a.type = 'CP'
);
INSERT INTO absences (
    ressource_id, site, date_debut, date_fin, type, competence, commentaire,
    validation_saisie, date_saisie, statut
)
SELECT 
    r.id,
    'BLAYAIS',
    '2026-01-15'::date,
    '2026-01-15'::date,
    'VM',
    NULL,
    'ValidÃ© par fabienne.bongiovanni le 23/12/2025 10:10',
    'Oui',
    '2025-12-23 10:09:53'::timestamp::timestamp,
    'Actif'
FROM ressources r
WHERE r.nom = 'MANDOT Jason'
AND NOT EXISTS (
    SELECT 1 FROM absences a 
    WHERE a.ressource_id = r.id 
    AND a.date_debut = '2026-01-15'::date 
    AND a.date_fin = '2026-01-15'::date
    AND a.type = 'VM'
);
