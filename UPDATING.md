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

Move the submodule and stage the pointer:

```sh
git -C kamado checkout <commit or tag>
git add kamado
```
