#!/bin/sh
executors=(bun node)

for i in "${!executors[@]}"; do
    if /usr/bin/env "${executors[$i]}" "$(dirname "$0")/tdbjs" $@; then
        exit $?
    else
        if [[ $? -eq 127 ]]; then
            echo "Failed to run ${executors[$i]} tdbjs - error code: tool not found" >&2
        else
            exit $? # Exit with the exit code from the failed command
        fi
    fi
done
# We didn't find any of them.
exit 1