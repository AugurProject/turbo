#!/usr/bin/env bash

# Found: https://gist.github.com/lukechilds/a83e1d7127b78fef38c2914c4ececc3c
VERSION=$(curl --silent "https://api.github.com/repos/AugurProject/turbo/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/');
curl -OL "https://github.com/AugurProject/turbo/releases/download/$VERSION/release.tar.gz";

tar -xzf release.tar.gz;

ipfs add -rq build;

rm -rf build;
rm release.tar.gz;


