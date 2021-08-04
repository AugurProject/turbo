#!/bin/sh

echo "Try to create the bridge";
until chainlink bridges create "{\"name\": \"$BRIDGE_NAME\", \"url\": \"$BRIDGE_URL\",\"confirmations\": 0,\"minimumContractPayment\": \"0\"}";
do
  echo "Trying again"
done

for f in ./templates/*.json; do
  echo "Adding job $f";
  envsubst < $f | sponge $f;
  chainlink job_specs create $f;

  cat $f;
done
