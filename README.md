# Vice Afterglow — GTA VI trophy guide

Vice Afterglow is a self-contained, offline checklist and guide for the 55 PlayStation 5 trophies in Grand Theft Auto VI. It combines step-by-step trophy notes with a saved completion tracker and a practical route to the platinum.

## Run locally

From this repository, start the static server:

```sh
node serve.ts
```

Then open [http://localhost:8080](http://localhost:8080). There is no build step, account, or network request. Earned trophies and the spoiler preference are stored in this browser's local storage.

## What it includes

- A checklist for all 55 trophies, with overall completion and progress by grade.
- Search and grade, trophy-kind, and earned-status filters.
- Per-trophy detail guides and a warning on the Chapter 1 meditation trophy.
- A spoiler switch that masks secret trophy names and descriptions until earned.
- A three-part roadmap covering the story and chapter saves, free-roam cleanup, and the 100% completion push.
- JSON export and import for moving checklist progress between browsers. Imports merge earned trophies.
- Deep links for grade-filtered and scrolled views, such as `/?grade=silver` and `/?grade=bronze&scroll=1400`.

## Trophy data and license

The trophy names, descriptions, and grades are retained from the official 55-entry list included with this project. Guide text and categories are original editorial notes; where a trigger is not established by the published list, the guide says so instead of presenting a guess as fact.

This project is provided under the MIT License; see [LICENSE](LICENSE). It is an unofficial fan-made guide and is not affiliated with Rockstar Games.
