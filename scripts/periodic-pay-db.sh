#!/bin/sh

# Variable initialization
sleepTime=86400
distributeScript="../distribute-tokens-db.js"
now=0
workingDir=$(pwd)

# Getting parameters
while [[ $# -gt 0 ]]; do
    case $1 in
        --sleepTime)
            sleepTime="$2"
            shift 2
            ;;
        --distributeScript)
            distributeScript="$2"
            shift 2
            ;;
        --now)
            now=1
            shift 1
            ;;
        *)
            usage
            ;;
    esac
done

distributeScript=$(realpath "$distributeScript")

# Logging
echo "Sleep Time: $sleepTime"
echo "Distribute Script: $distributeScript"

if [ "$now" -eq 0 ]; then
    echo "Waiting $sleepTime seconds before first distribution..."
    sleep "$sleepTime"
fi

# Executing script
while true; do
    echo "-------------------------"
    echo "Distributing Tokens Start"
    echo "-------------------------"

    scriptDir=$(dirname "$distributeScript")
    cd $scriptDir
    node "$distributeScript"
    cd "$workingDir"

    echo "-------------------------"
    echo "Script Finished"
    echo "-------------------------"
    sleep "$sleepTime"
done