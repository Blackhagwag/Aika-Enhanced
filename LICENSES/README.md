# Licenses and authors

Aika Enhanced is the theme **Aika** by **hatewxb** (https://github.com/hatewxb/Aika,
0.1.8, commit 26203656466dbab31ab644fa9c425cdd2d565c85) with one addition, the
Friends Dock, whose behaviour is adapted from the Friends dock of **Steam Enhanced**
by **NVHT** (https://github.com/NVHT/Steam-Enhanced, 1.4.4, commit
f411d9a57612ece59a56aa8d112cef44ac03d9be).

| Part | Author | License |
| --- | --- | --- |
| Everything from Aika (CSS, JS, options, assets, docs, tools, tests) | hatewxb | **No license file is published in the Aika repository** — see the note below |
| Friends Dock behaviour adapted in `js/friends-dock.js` (the FriendStore data pass, persona states, chat/profile actions, the reserved column beside the library, the small-window fold) | NVHT | MIT — [`Steam-Enhanced-MIT.txt`](Steam-Enhanced-MIT.txt) |
| `vendor/steam-enhanced/` — Steam Enhanced 1.4.4 parts copied from NVHT/Steam-Enhanced@7d8439c: the runtime, the popup layer, menus, the Friends dock chat engine, the Millennium Settings design, the theme settings window, the library manager, Brew Hub's page, icons and tokens. Patches are marked "Aika Enhanced" in the files; `client/loader.js`, `aika-*.js`, `friends-dock-aika*.css`, `aika-foundation.css` are Aika Enhanced's own | NVHT (copied parts) | MIT — `vendor/steam-enhanced/LICENSE` |
| Millennium's backend calls used by the settings window (Core_GetStartConfig, Core_ChangeCondition, Core_GetThemeColorOptions, Core_ChangeColor) — called, not copied | Project Millennium | (MIT, not bundled) |
| Inter, Onest, Geist Mono, Fraunces, Unbounded, UnifrakturMaguntia, Shojumaru, Great Vibes, Yuji Syuku, Yuji Mai fonts (bundled by Aika) | their authors | SIL OFL 1.1 — `assets/fonts/OFL-*.txt` |
| hyalite liquid glass (bundled by Aika) | VII-Cae | MIT — `js/vendor/LICENSE-hyalite.txt` |
| Aika Enhanced additions (Friends Dock markup, styling, settings, installers, tests) | Aika Enhanced contributors | Offered under the same terms as the rest of the project |

The Friends Dock's own look is built only from Aika's tokens and components. The parts
copied from Steam Enhanced keep their structure and take Aika's palette, type, radii and motion
through the token bridge at the end of `vendor/steam-enhanced/core/tokens.css`.

## Note on Aika's license

The Aika repository has no LICENSE file. Without one, copyright law reserves all
rights to its author. Using Aika Enhanced on your own computer is the same use the
Aika author offers through Steambrew; **publishing or redistributing Aika Enhanced
(a public repository, the Steambrew store, a release archive) needs the permission
of hatewxb**. Ask the author first (https://github.com/hatewxb/Aika/issues).

Steam and the Steam logo are trademarks of Valve Corporation. Neither project nor
this one is affiliated with Valve.
