# 🎵 Lecteur MP3 personnel

Un petit lecteur de musique **100 % local**, en JavaScript, sans aucune dépendance.

- **1 dossier = 1 album** : le nom du dossier est le nom de l'album, rien n'est cherché sur internet, aucun tri automatique.
- **Clic sur un album** → l'album se lance du début et la liste des titres s'affiche.
- **Clic sur un titre** → lecture de ce titre, puis la suite de l'album s'enchaîne.
- Si un dossier contient une image (`cover.jpg`, `folder.jpg`… ou n'importe quelle image), elle sert de pochette. Sinon, une vignette colorée avec les initiales.
- Les sous-dossiers d'un album (`CD1`, `CD2`…) sont inclus.
- Les numéros en début de nom de fichier (`01 - Titre.mp3`) sont masqués à l'affichage, mais servent à l'ordre.
- Formats : mp3, m4a, flac, ogg, opus, wav, aac.

## Prérequis

[Node.js](https://nodejs.org) (version 18 ou plus). Rien d'autre à installer.

## Lancement

```bash
node server.js "C:\Users\MonNom\Music"
```

Le navigateur s'ouvre tout seul sur http://localhost:3000.

Sous Windows, tu peux aussi modifier le chemin dans `lancer.bat` puis double-cliquer dessus.

Port différent : `node server.js "C:\Musique" 4000`

## Choisir un dossier depuis l'interface

Le bouton **📁 Choisir un dossier** (en haut à droite) permet de charger un autre dossier de musique
directement depuis la page, y compris sans serveur (par exemple sur la version en ligne).
Le navigateur lit les fichiers sur ton appareil : rien n'est envoyé sur internet.
Chrome affiche un message du type « Importer N fichiers sur ce site ? » : c'est le message standard
de Chrome pour le choix d'un dossier, les fichiers ne quittent pas ton ordinateur.

## Installer comme application (Chromebook, Chrome, Edge)

Sur la version en ligne (https://lecteur.pauwels.ovh), un bouton **⬇ Installer** apparaît en haut à droite
dans Chrome et Edge. Un clic, et le lecteur devient une application : icône dans le lanceur du Chromebook,
fenêtre à part. Le bouton n'apparaît pas si l'application est déjà installée ou si le navigateur ne le permet pas.

## Dossier mémorisé (Chrome, Edge, Chromebook)

Le dossier choisi est **mémorisé**. Au lancement suivant, un bouton **▶ Reprendre** apparaît ;
Chrome demande alors l'autorisation de lire le dossier. Choisir **« Autoriser à chaque visite »**
rend la chose définitive : le dossier se recharge tout seul à chaque ouverture, sans aucun clic.
Dans les autres navigateurs (Firefox, Safari), le dossier se choisit à chaque fois.

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
