# Unseen Sport

Petite application de suivi musculation pour creer ses seances, lancer un entrainement, saisir les series, puis suivre les statistiques utiles:

- volume total souleve;
- repetitions totales;
- nombre de seances terminees;
- meilleurs poids par exercice;
- historique des seances.

L'application est statique et sauvegarde les donnees dans le navigateur avec `localStorage`.

## Lancer en local

Ouvrir `index.html` dans un navigateur, ou servir le dossier:

```powershell
node dev-server.js
```

Puis ouvrir `http://localhost:4173`.

## Hebergement GitHub Pages

1. Creer un depot GitHub.
2. Pousser ce dossier sur la branche `main`.
3. Dans GitHub, aller dans `Settings` -> `Pages`.
4. Choisir `GitHub Actions` comme source.
5. Le workflow inclus publie automatiquement le site a chaque push sur `main`.
