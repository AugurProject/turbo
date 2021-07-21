#!/bin/sh

echo "Create .api file";
echo "$API_EMAIL" > /chainlink/.api;
echo "$API_PASSWORD" >> /chainlink/.api;

echo "Create .password file";
echo "$KEYSTORE_PASSWORD" > /chainlink/.password;
