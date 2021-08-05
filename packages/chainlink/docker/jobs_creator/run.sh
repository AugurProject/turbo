#!/bin/bash

# Wait for node to get online.
until chainlink bridges list;
do
  echo "Trying again";
done

# Check to see if bridge has already been added.
chainlink bridges show $BRIDGE_NAME 2> /dev/null;
if [ $? -eq 0 ]
then
  echo "Bridge already created. Exiting....."
  exit 0;
fi

echo "Try to create the bridge";
chainlink bridges create "{\"name\": \"$BRIDGE_NAME\", \"url\": \"$BRIDGE_URL\",\"confirmations\": 0,\"minimumContractPayment\": \"0\"}";

for f in ./templates/*.json; do
  echo "Adding job $f";
  envsubst < $f | sponge $f;
  chainlink job_specs create $f;

  cat $f;
done
