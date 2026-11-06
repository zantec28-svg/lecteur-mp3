# 🎵 Lecteur MP3 personnel

Un petit lecteur de musique **100 % local**, en JavaScript, sans aucune dépendance.

- **1 dossier = 1 album** : le nom du dossier est le nom de l'album, rien n'est cherché sur internet, aucun tri automatique.
- **Clic sur un album** → l'album se lance du début et la liste des titres s'affiche.
- **Clic sur un titre** → lecture de ce titre, puis la suite de l'album s'enchaîne.
- Si un dossier contient une image (`cover.jpg`, `folder.jpg`… ou n'importe quelle image), elle sert de pochette. Sinon, une vignette colorée avec les initiales.
- Les sous-dossiers d'un album (`CD1`, `CD2`…) sont inclus.
- Les numéros en début de nom de fichier (`01 - Titre.mp3`) sont masqués à l'affichage, mais servent à l'ordre.
- Formats : mp3, m4a, flac, ogg, opus, wav, aac.

## Sur Chromebook (ou n'importe quel navigateur) — sans rien installer

Le lecteur est en ligne sur **https://lecteur.pauwels.ovh** et s'installe comme une vraie application :

1. Ouvrir https://lecteur.pauwels.ovh dans Chrome.
2. Cliquer sur l'icône **Installer** à droite de la barre d'adresse
   (ou menu ⋮ → *Caster, enregistrer et partager* → *Installer la page en tant qu'application*).
3. « Lecteur MP3 » apparaît dans le lanceur : il s'ouvre dans sa propre fenêtre.
4. Au premier lancement : **Choisir mon dossier de musique** (par ex. *Mes fichiers › Musique*).
   Le dossier est mémorisé : aux lancements suivants, un clic sur **Reprendre** suffit
   (Chrome redemande simplement l'autorisation de lecture).

Les fichiers sont lus directement sur l'appareil : **rien n'est envoyé sur internet**.

## Sur PC avec Node.js

### Prérequis

[Node.js](https://nodejs.org) (version 18 ou plus). Rien d'autre à installer.

### Lancement

```bash
node server.js "C:\Users\MonNom\Music"
```

Le navigateur s'ouvre tout seul sur http://localhost:3000.

Sous Windows, tu peux aussi modifier le chemin dans `lancer.bat` puis double-cliquer dessus.

Port différent : `node server.js "C:\Musique" 4000`

Dans ce mode, la bibliothèque est lue par le serveur local : pas besoin de choisir le dossier.

## Organisation attendue

```
Musique/
├── Daft Punk - Discovery/
│   ├── cover.jpg
│   ├── 01 - One More Time.mp3
│   └── 02 - Aerodynamic.mp3
└── Pink Floyd - The Wall/
    ├── CD1/
    └── CD2/
```

## Raccourcis clavier

| Touche | Action |
|---|---|
| Espace | Lecture / pause |
| Ctrl + → | Titre suivant |
| Ctrl + ← | Titre précédent (ou retour au début du titre) |

Les touches multimédia du clavier fonctionnent aussi.

## Confidentialité

Le serveur n'écoute que sur `127.0.0.1` : il n'est accessible que depuis ton PC, et il n'accède qu'au dossier de musique indiqué.
