# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Freshly scaffolded? Work the
[New Package Checklist](../start-technologies/projects/start-sdk/docs/src/new-package-checklist.md)
(or <https://docs.start9.com/packaging/new-package-checklist.html>) from top to bottom. It is a
guide page, not a file in this repo — read it, don't copy it in.

Keep `README.md` (technical reference for an AI support or administering agent) and
`instructions.md` (end-user docs) in sync with your changes.

**Bugs and feature requests are GitHub issues on this repo** — file them as you find them.
Don't record work in the repo instead: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you
verified, tried, and decided belongs in the commit message and the PR body.

## This repo

- **`kamado/` is the application, as a submodule.** The `Dockerfile` builds everything from it: ckpool is cloned at the commit named in `kamado/ckpool/CKPOOL_COMMIT` with `kamado/ckpool/patches/` applied, the dashboard and API are built from `kamado/ui` and `kamado/api`. Don't pin ckpool or copy source into this repo a second time; bump the submodule (`UPDATING.md`).
- **ckpool's `serverurl` array (`stratumServerUrls` in `startos/utils.ts`) is a contract with the dashboard.** ckpool tags each miner with the index of the bind it arrived on and `STRATUM_SERVERS` tells the dashboard what each index means, so the array is always all three entries in that order — never emit it conditionally on the TLS settings.
- **Don't add a stratum port setting.** The in-container ports are fixed because a binding is keyed by host and internal port, so moving one orphans the old binding and the user sees a duplicate interface; and the external ports are the OS's — `preferredExternalPort` is honoured only when a binding is first created, after which StartOS reclaims the port it already assigned, so a setting that feeds it can never move a port.
- **`stratumServers()` labels are English on purpose** — they render inside the upstream dashboard, not the StartOS UI.
