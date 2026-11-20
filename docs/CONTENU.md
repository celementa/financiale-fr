# Guide de modification du contenu

Tout le contenu du site est dans des fichiers texte. Toute modification passe par Git : elle est relue, versionnée, et peut être annulée à tout moment. Après fusion sur la branche `main`, le site est mis en ligne automatiquement en quelques minutes.

## Où se trouve quoi ?

| Je veux modifier… | Fichier |
|---|---|
| Le texte d'une page | `src/content/pages/<page>.yaml` (`index.yaml` = accueil) |
| Un article de blog / en ajouter un | `src/content/blog/<slug>.md` |
| Le menu, le pied de page, l'adresse, le téléphone | `src/data/site.yaml` |
| Un membre de l'équipe (nom, titre, photo) | `src/data/team.yaml` |
| La page contact et les choix du formulaire | `src/data/contact.yaml` |
| Les mentions légales | `src/data/mentions-legales.md` |
| L'avertissement sous les encadrés « Bon à savoir » | `disclaimer` dans `src/data/site.yaml` |

## Les pages : une suite de blocs

Chaque page est une liste de **blocs** affichés dans l'ordre. Pour déplacer une section, déplacez son bloc. Pour la supprimer, supprimez le bloc.

```yaml
slug: courtage-assurance          # adresse de la page : /courtage-assurance
seo:
  title: "…"                      # titre Google (70 caractères max)
  description: "…"                # description Google (170 caractères max)
blocks:
  - type: hero
    image: /images/xxx.jpg
    title: "Première ligne\nDeuxième ligne"   # \n = retour à la ligne
    text: "…"
    cta: { label: "Demander un diagnostic", href: /contact }
  - type: context
    …
```

### Types de blocs disponibles

| `type` | Rôle | Champs principaux |
|---|---|---|
| `hero` | Bandeau d'ouverture avec image | `image`, `title`, `text`, `cta`, `eyebrow`, `variant` (`home`, `banner`) |
| `about` | Qui sommes-nous + chiffres en escalier | `eyebrow`, `title`, `text`, `link`, `image`, `stats[]` |
| `stats` | Rangée de chiffres clés | `items[]` (`value`, `label`) |
| `statsBanner` | Chiffres sur grande image | `image`, `title`, `items[]` |
| `context` | « Le contexte » + citations | `eyebrow`, `title`, `paragraphs[]`, `quotesTitle`, `quotes[]`, `outro`, `image` |
| `carousel` | Cartes défilantes | `eyebrow`, `title`, `text`, `items[]` (`title`, `text`, `image`), `tone` (`dark`/`light`) |
| `focus` | Zoom sur un dispositif + « Bon à savoir » | `eyebrow`, `title`, `image`, `paragraphs[]`, `box[]`, `disclaimer: true` |
| `process` | Méthode en étapes | `eyebrow`, `title`, `image`, `steps[]` (`label`, `title`, `text`), `cta`, `tone` |
| `team` | Portraits de l'équipe | `eyebrow`, `title`, `members[]` (identifiants de team.yaml), `roles` (titres propres à la page), `link` |
| `teamCarousel` | Équipe élargie défilante | `title`, `members[]` |
| `related` | Expertises liées | `eyebrow`, `title`, `link`, `items[]` (`title`, `text`, `image`, `href`) |
| `cta` | Appel à l'action final | `title`, `text`, `image`, `cta` |
| `pillars` | 3 grandes cartes (accueil) | `eyebrow`, `title`, `link`, `logo`, `items[]` |
| `services` | Liste d'expertises en lignes | `eyebrow`, `title`, `text`, `cta`, `items[]`, `tone`, `asideImage` |
| `sportTeaser` | Teaser Sport avec diaporama | `eyebrow`, `title`, `text`, `points[]`, `cta`, `slides[]` |
| `tabs` | Onglets (accordéon) avec image | `eyebrow`, `title`, `text`, `items[]`, `cta` |
| `quote` | Citation sur image | `image`, `quote`, `author` |
| `testimonial` | Témoignage client | `eyebrow`, `title`, `image`, `quote`, `author` |
| `features` | 4 atouts sur fond blanc | `eyebrow`, `title`, `text`, `items[]` |
| `comparison` | Tableau comparatif | `eyebrow`, `title`, `criteria[]`, `columns[]` (`title`, `values[]`, `highlight`) |
| `story` | Notre histoire | `eyebrow`, `title`, `paragraphs[]`, `link`, `image` |
| `values` | Nos valeurs (3 cartes) | `eyebrow`, `title`, `text`, `items[]` |

## Ajouter un article de blog

Créez `src/content/blog/mon-article.md` (le nom du fichier devient l'adresse `/blog/mon-article`, sans accents ni espaces) :

```markdown
---
title: "Titre de l'article"
description: "Résumé pour Google, 170 caractères maximum."
date: 2026-11-20
image: /images/mon-image.jpg
imageAlt: "Description de l'image"
---

Introduction…

### Premier intertitre

Texte…
```

Ajoutez `draft: true` pour préparer un article sans le publier.

## Ajouter ou remplacer une image

1. Déposez le fichier (JPG, PNG ou WebP, 2 500 px de large maximum) dans `src/assets/images/`, avec un nom sans accents ni espaces.
2. Référencez-le dans le contenu sous la forme `/images/nom-du-fichier.jpg`.

Inutile de redimensionner ou de compresser l'image : les versions AVIF/WebP optimisées sont générées automatiquement.

## Vérifier avant de publier

```bash
npm run check   # images manquantes, liens cassés, membres d'équipe inconnus
npm run dev     # aperçu local sur http://localhost:4321
```

La même vérification est lancée automatiquement sur chaque proposition de modification.
