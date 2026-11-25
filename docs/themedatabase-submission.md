# ThemeDatabase listing (prepared, NOT submitted)

Millennium → Updates only shows updates for themes listed in
[SteamClientHomebrew/ThemeDatabase](https://github.com/SteamClientHomebrew/ThemeDatabase)
(steambrew.app answers `checkupdates` only for listed repositories — verified against the
API on 2026-11-25: `hatewxb/Aika` is answered, `Blackhagwag/Aka-Enhanced` is not).
Listing also puts the theme on steambrew.app.

## Before submitting

1. **Permission from hatewxb.** Aika has no licence; a public listing redistributes it.
   Draft request below. Do not submit without a clear yes from hatewxb (keep a link to it).
2. The repository is public, named `Blackhagwag/Aika-Enhanced`, default branch `main`,
   at a release (`v2.0.1` or later).
3. `skin.json` on `main`: `github.owner` = `Blackhagwag`, `github.repo_name` = `Aika-Enhanced`;
   `header_image` / `splash_image` load as images over https (raw.githubusercontent.com).
4. Owner's explicit confirmation to open the pull request.

## The pull request

Fork ThemeDatabase, add one entry at the end of `themes` in `metadata.json`:

```json
{
    "owner": "Blackhagwag",
    "repo": "Aika-Enhanced"
}
```

Title: `Add Aika Enhanced`

Body:

> Aika Enhanced — Aika (by hatewxb) with a Friends Dock and its built-in chat on every page, and
> Steam Enhanced's (NVHT, MIT) Millennium Settings, in Aika's look.
>
> - Repository: https://github.com/Blackhagwag/Aika-Enhanced (skin.json at the root, default branch `main`)
> - Based on Aika 0.1.8 with the permission of hatewxb: <link to the permission>
> - Steam Enhanced parts are MIT, licence included (`vendor/steam-enhanced/LICENSE`)
> - Credits and licences: `LICENSES/README.md`

The ThemeDatabase check (`.github/scripts/check-skin.sh`, strict mode for new entries) verifies
the `github` block and both images; `tools/validate.mjs` runs the same checks locally.

Commands (after confirmation):

```powershell
gh repo fork SteamClientHomebrew/ThemeDatabase --clone=false
# edit metadata.json in the fork on a branch "add-aika-enhanced", then:
gh pr create --repo SteamClientHomebrew/ThemeDatabase --head Blackhagwag:add-aika-enhanced --title "Add Aika Enhanced" --body-file <body.md>
```

## Draft: permission request to hatewxb (issue on hatewxb/Aika)

Title: `Permission to publish Aika Enhanced (a derivative of Aika) on GitHub and steambrew`

> Hi! I made **Aika Enhanced** for my own use: Aika 0.1.8 unchanged in look, plus a Friends Dock
> with built-in chat on every page and Steam Enhanced's Millennium Settings (MIT parts from NVHT),
> all styled with Aika's tokens. Repository: https://github.com/Blackhagwag/Aika-Enhanced
>
> Aika has no licence file, so I'd like to ask your permission to keep this repository public and
> to list it on steambrew.app (ThemeDatabase), with you credited as the author of Aika in the
> theme's `author` field, README and `LICENSES/README.md`, and a link back to your repository.
> If you prefer, I can keep it private, change the credits, or follow a licence you choose.
>
> Thank you for Aika!
