#!/bin/sh

# Variable initialization
sleepTime=86400
lockPath="./wallets.lock"
resyncPath="./wallets.resync"
distributeScript="../distribute-tokens-json.js"
now=0
workingDir=$(pwd)

# Getting parameters
while [[ $# -gt 0 ]]; do
    case $1 in
        --sleepTime)
            sleepTime="$2"
            shift 2
            ;;
        --lockPath)
            lockPath="$2"
            shift 2
            ;;
        --resyncPath)
            resyncPath="$2"
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
echo "Lock Path: $lockPath"
echo "Resync Path: $resyncPath"
echo "Distribute Script: $distributeScript"

if [ "$now" -eq 0 ]; then
    echo "Waiting $sleepTime seconds before first distribution..."
    sleep "$sleepTime"
fi

# Executing script
while true; do
    # Check if lock file exist
    if [ -f "$lockPath" ]; then
        echo "Lock file exists. Waiting 1 minute to run again..."
        sleep 60
        continue
    fi
    # Check if resync file exist
    if [ -f "$resyncPath" ]; then
        echo "Resync file exists. Waiting 1 minute to run again..."
        sleep 60 
        continue
    fi

    touch "$lockPath"
    echo "-------------------------"
    echo "Distributing Tokens Start"
    echo "-------------------------"

    scriptDir=$(dirname "$distributeScript")
    cd $scriptDir
    node "$distributeScript"
    cd "$workingDir"

    rm -rf "$lockPath"

    echo "-------------------------"
    echo "Script Finished"
    echo "-------------------------"
    touch "$resyncPath"
    sleep "$sleepTime"
done