# Aix en Vue – Générateur de Devis & Factures

Application web **100 % côté client** pour générer des devis et factures professionnels en PDF, à destination des membres de l'association **Aix en Vue** (Loi 1901).

---

## Structure du projet

```
index.html        → Page unique de l'application (HTML5)
style.css         → Mise en forme (système de design rouge/noir AEV)
app.js            → Logique métier + génération PDF (jsPDF)
logo.png          → Logo de l'association (à placer à la racine)
firebase.json     → Configuration hébergement Firebase
cloudbuild.yaml   → Pipeline CI/CD Google Cloud Build
README.md         → Ce fichier
```

---

## Fonctionnalités

- **Sélection du type** : Devis ou Facture via un bouton toggle
- **Références** : numéro de devis, numéro de facture (facture uniquement), date
- **Informations client** : organisation, SIREN, contact, email
- **Lignes de prestation** : ajout/suppression de lignes, désignation, quantité, prix unitaire
- **Calcul automatique** : total par ligne et total général en temps réel
- **Génération PDF** : téléchargement automatique au clic avec :
  - En-tête association (logo, nom, adresse, SIRET)
  - Bloc émetteur / destinataire
  - Tableau des prestations
  - Bloc total TTC
  - Coordonnées bancaires (IBAN / BIC)
  - Conditions de règlement personnalisables
  - Mention TVA (exonération Loi 1901)
  - Bloc « Bon pour accord » + zones date/signature *(devis uniquement)*

---

## Stack technique

| Élément | Technologie |
|---------|-------------|
| Langage | Vanilla JavaScript (ES6+) |
| PDF | [jsPDF 2.5.1](https://github.com/parallax/jsPDF) + [jsPDF-AutoTable 3.8.2](https://github.com/simonbengtsson/jsPDF-AutoTable) |
| Images | [html2canvas 1.4.1](https://html2canvas.hertzen.com/) |
| Polices | Google Fonts – Playfair Display, DM Sans |
| Hébergement | Firebase Hosting (via Cloud Build) |

Aucun framework, aucun bundler, aucun serveur requis.

---

## Déploiement

### Firebase Hosting (production)

Le pipeline est automatique via `cloudbuild.yaml` : chaque push sur `main` déclenche un déploiement Firebase.

Pour déployer manuellement :

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

### GitHub Pages (alternatif)

1. Créer un dépôt GitHub
2. Uploader tous les fichiers à la **racine**
3. `Settings → Pages → Deploy from branch → main / root`
4. URL : `https://<utilisateur>.github.io/<dépôt>/`

> Placer `logo.png` à la racine. Sans logo, le PDF est généré sans l'image.

---

## Utilisation

1. Choisir le **type de document** (Devis / Facture)
2. Renseigner les **références** (numéro, date)
3. Renseigner les **informations client**
4. Ajouter les **lignes de prestation** (désignation, quantité, prix unitaire)
5. Vérifier/modifier les **conditions de règlement** si nécessaire
6. Cliquer **Générer le devis/facture PDF** → téléchargement automatique

---

## Validation des champs

Avant génération, l'application vérifie :

- Numéro de devis (obligatoire en mode Devis)
- Numéro de facture (obligatoire en mode Facture)
- Date du document (obligatoire)
- Nom de l'organisation cliente (obligatoire)
- Au moins une ligne de prestation avec une désignation

---

## Informations de l'association (pré-remplies dans `app.js`)

| Champ | Valeur |
|-------|--------|
| Nom | Aix en Vue |
| Statut | Association Loi 1901 Reconnue d'intérêt général |
| SIRET | 92855251200016 |
| Adresse | 23 boulevard François et Emile Zola, 13 100 Aix-en-Provence |
| Téléphone | 07 44 99 94 38 |
| Email | info@aixenvue.fr |
| IBAN | FR76 1130 6000 4848 1698 0648 170 |
| BIC | AGRIFRPP813 |

Pour modifier ces informations, éditer la constante `ASSO` en haut de `app.js`.
