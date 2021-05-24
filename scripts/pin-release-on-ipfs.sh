#!/usr/bin/env bash

# Found: https://gist.github.com/lukechilds/a83e1d7127b78fef38c2914c4ececc3c
VERSION=$(curl --silent "https://api.github.com/repos/AugurProject/turbo/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/');
curl -OL "https://github.com/AugurProject/turbo/releases/download/$VERSION/release.tar.gz";

tar -xzf release.tar.gz;

IPFS_HASH_CIDv0=$(ipfs add -rq --silent build | sed '$!d');
IPFS_HASH_CIDv1=$(ipfs cid base32 $IPFS_HASH_CIDv0);

echo "CIDv0: $IPFS_HASH_CIDv0";
echo "CIDv1: $IPFS_HASH_CIDv1";

rm -rf build;
rm release.tar.gz;


