# Updating the upstream version

Kamado Pool is built from the `kamado/` git submodule
(<https://github.com/carbonatedberry/KamadoPool>): the patched ckpool, the Go API
and the Svelte dashboard all come from whatever commit it points at. There is no
`dockerTag`. ckpool's own pin (`kamado/ckpool/CKPOOL_COMMIT`) travels with the
submodule.

## Determining the upstream version

Upstream cuts no releases or tags yet; the package version is the one upstream's
maintainer assigns to the commit. Check for new commits and for tags:

```sh
git -C kamado fetch --tags
git -C kamado log --oneline HEAD..origin/main
git -C kamado tag --sort=-v:refname | head -5
```

The pin is the submodule's recorded commit in this repo's tree.

## Applying the bump

1. Move the submodule and stage the pointer:

   ```sh
   git -C kamado checkout <commit or tag>
   git add kamado
   ```

2. Set `version` in `startos/versions/current.ts` to `<upstream version>:0`.
3. Rewrite `releaseNotes` in that file for all five locales (`en_US`, `es_ES`,
   `de_DE`, `pl_PL`, `fr_FR`): what a StartOS user can observe, plus a migration
   instruction if they need one.
4. If only the packaging changed, leave the submodule and the upstream half of
   the version alone and increment the revision instead (`X.Y.Z:0` → `X.Y.Z:1`).

A new version file is only needed when the on-disk layout under `/root/.kamado`
or `/root/.ckpool` changes. A plain application or packaging bump keeps
`migrations.up` empty and stays in `current.ts`.
