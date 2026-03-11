# Aix en Vue – Générateur de Factures

Application web statique pour générer des factures professionnelles en PDF.

## Fichiers

```
index.html   → Structure de la page
style.css    → Mise en forme (couleurs rouge/noir Aix en Vue)
app.js       → Logique métier + génération PDF (jsPDF)
logo.png     → Logo de l'association (à placer à la racine)
README.md    → Ce fichier
```

## Déploiement sur GitHub Pages

1. Créer un dépôt GitHub (ex: `aix-en-vue-factures`)
2. Uploader tous les fichiers **à la racine** du dépôt
3. Aller dans **Settings → Pages**
4. Source : `Deploy from a branch` → branche `main`, dossier `/ (root)`
5. Cliquer **Save** — l'URL sera `https://<utilisateur>.github.io/<dépôt>/`

> ⚠️ Placer le fichier `logo.png` à la racine du dépôt.  
> Si le logo n'est pas disponible, la facture sera générée sans logo.

## Utilisation

1. Remplir les **références** (n° devis, n° facture, date)
2. Remplir les **informations client**
3. Ajouter les **lignes de prestation** (désignation, quantité, prix)
4. Cliquer **Générer la facture PDF** → téléchargement automatique

## Fonctionnement

- 100% côté client, aucun serveur requis
- PDF généré par [jsPDF](https://github.com/parallax/jsPDF) + [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- Calculs automatiques (total ligne, total général, acompte 40% / solde 60%)
- Informations fixes de l'association pré-remplies (SIRET, RIB, mentions légales)
