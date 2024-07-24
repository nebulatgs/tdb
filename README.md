# tdb

_Run temporary databases using WebAssembly fully locally!_

Supports
- MySQL (as MariaDB)
- PostgreSQL (as [pglite](https://github.com/electric-sql/pglite))

To get started, install globally using `pnpm`
```sh
pnpm install --global @nebulatgs/tdb
```

Currently, the data directory containing the database distribution is downloaded as a `postInstall` step.\
This will be moved to a separate command soon.

## Help

```sh
Name:     tdb
Version:  0.0.6-alpha

Description:

    Temporary databases in WASM.

Usage:

    $ tdb <command> [flags]

Commands:

    tdb completions         -  Print shell completions to stdout
    tdb help                -  Show help
    tdb pg, tdb postgres    -  Launch a PostgreSQL instance
    tdb mysql, tdb mariadb  -  Launch a MySQL/MariaDB instance

Global Flags:

    --help, -h    -  Show help  (Default: false)
```

## MySQL Command
```sh
Name:        tdb
Version:     0.0.6-alpha
Subcommand:  tdb mysql

Description:

    Launch a MySQL/MariaDB instance

Usage:

    $ tdb mysql [flags]

Global Flags:

    --help, -h    -  Show help  (Default: false)

Flags:

    --port, -p  [number]  -  Port to launch MySQL on       (Default: 3306)
    --logs, -l            -  Show MySQL logs               (Default: false)
    --save, -s  [string]  -  Save state with a given name  (Default: null)
```

## PostgreSQL Command
```
Name:        tdb
Version:     0.0.6-alpha
Subcommand:  tdb pg

Description:

    Launch a PostgreSQL instance

Usage:

    $ tdb pg [flags]

Global Flags:

    --help, -h    -  Show help  (Default: false)

Flags:

    --port, -p  [number]  -  Port to launch PostgreSQL on  (Default: 5432)
    --logs, -l            -  Show PostgreSQL logs          (Default: false)
    --save, -s  [string]  -  Save state with a given name  (Default: null)
```

## Debug

Run with the environment variable `DEBUG` set to `1` to show raw TCP traffic for MySQL.
