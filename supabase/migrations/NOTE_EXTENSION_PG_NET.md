# Note concernant l'extension pg_net

## Avertissement de sécurité

L'extension `pg_net` génère un avertissement de sécurité car elle est installée dans le schéma `public`.

## Pourquoi cet avertissement peut être ignoré

L'extension `pg_net` est une **extension officielle de Supabase** qui doit rester dans le schéma `public` pour fonctionner correctement avec :

- Les Edge Functions
- Les webhooks
- Les tâches planifiées (pg_cron)
- Les notifications en temps réel

## Statut

✅ **Cet avertissement peut être ignoré en toute sécurité**

C'est une dépendance système gérée par Supabase elle-même. Déplacer cette extension dans un autre schéma casserait les fonctionnalités Supabase qui en dépendent.

## Référence

- Documentation Supabase : https://supabase.com/docs/guides/database/extensions/pg_net
- Version actuelle : 0.19.5

