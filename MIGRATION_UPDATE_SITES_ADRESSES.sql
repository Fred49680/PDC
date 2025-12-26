-- ============================================
-- MIGRATION : Mise à jour des adresses des sites (centrales nucléaires)
-- ============================================
-- Cette migration ajoute les adresses complètes de toutes les centrales nucléaires françaises

-- Sud Ouest
UPDATE sites SET adresse = 'Centrale Nucléaire de Blayais, 33340 Blaye, France' WHERE site_key = 'BLAYAIS';
UPDATE sites SET adresse = 'Centrale Nucléaire de Golfech, 82400 Valence-d''Agen, France' WHERE site_key = 'GOLFECH';
UPDATE sites SET adresse = 'Centrale Nucléaire de Civaux, 86320 Civaux, France' WHERE site_key = 'CIVAUX';

-- Val de Rhône
UPDATE sites SET adresse = 'Centrale Nucléaire du Bugey, 01550 Saint-Vulbas, France' WHERE site_key = 'BUGEY';
UPDATE sites SET adresse = 'Centrale Nucléaire de Cruas, 07350 Cruas, France' WHERE site_key = 'CRUAS';
UPDATE sites SET adresse = 'Centrale Nucléaire du Tricastin, 26700 Pierrelatte, France' WHERE site_key = 'TRICASTIN';
UPDATE sites SET adresse = 'Centrale Nucléaire de Saint-Alban, 38550 Saint-Maurice-l''Exil, France' WHERE site_key = 'SAINT ALBAN';

-- Val de Loire
UPDATE sites SET adresse = 'Centrale Nucléaire de Chinon, 37420 Avoine, France' WHERE site_key = 'CHINON';
UPDATE sites SET adresse = 'Centrale Nucléaire de Dampierre, 45480 Dampierre-en-Burly, France' WHERE site_key = 'DAMPIERRE';
UPDATE sites SET adresse = 'Centrale Nucléaire de Belleville, 18240 Belleville-sur-Loire, France' WHERE site_key = 'BELLEVILLE';
UPDATE sites SET adresse = 'Centrale Nucléaire de Saint-Laurent, 41220 Saint-Laurent-Nouan, France' WHERE site_key = 'SAINT-LAURENT';
UPDATE sites SET adresse = 'Centrale Nucléaire de Creys-Malville, 38510 Morestel, France' WHERE site_key = 'CREYS-MALVILLE';
UPDATE sites SET adresse = 'Centrale Nucléaire de Savigny, 89310 Saint-Florentin, France' WHERE site_key = 'SAVIGNY';

-- Manche / Normandie
UPDATE sites SET adresse = 'Centrale Nucléaire de Flamanville, 50340 Flamanville, France' WHERE site_key = 'FLAMANVILLE';
UPDATE sites SET adresse = 'Centrale Nucléaire de Penly, 76630 Penly, France' WHERE site_key = 'PENLY';
UPDATE sites SET adresse = 'Centrale Nucléaire de Paluel, 76450 Paluel, France' WHERE site_key = 'PALUEL';

-- Pays de Caux
UPDATE sites SET adresse = 'Centrale Nucléaire de Gravelines, 59820 Gravelines, France' WHERE site_key = 'GRAVELINES';

-- Nord Est
UPDATE sites SET adresse = 'Centrale Nucléaire de Cattenom, 57570 Cattenom, France' WHERE site_key = 'CATTENOM';
UPDATE sites SET adresse = 'Centrale Nucléaire de Fessenheim, 68740 Fessenheim, France' WHERE site_key = 'FESSENHEIM';
UPDATE sites SET adresse = 'Centrale Nucléaire de Nogent, 10400 Nogent-sur-Seine, France' WHERE site_key = 'NOGENT';

-- Autre Site (pas d'adresse spécifique)
UPDATE sites SET adresse = NULL WHERE site_key = 'AUTRE SITE';

