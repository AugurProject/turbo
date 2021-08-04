FROM smartcontract/chainlink:0.10.9

RUN apt-get install -y gettext-base moreutils

ADD templates /files/templates
ADD run.sh /files
WORKDIR /files

ENV BRIDGE_URL="http://augur-adapter:8080"
ENV BRIDGE_NAME="augur-adapter"

# These are the deployed contract addresses and must be set for the world to work right.
ENV CRYPTO_MARKET_FACTORY="REPLACE_ME"
ENV MLB_MARKET_FACTORY="REPLACE_ME"
ENV MMA_MARKET_FACTORY="REPLACE_ME"
ENV NBA_MARKET_FACTORY="REPLACE_ME"

ENTRYPOINT ./run.sh
