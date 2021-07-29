FROM bash:latest

ENV API_EMAIL="team@forecastfoundation.org"
ENV API_PASSWORD="PASSword123!!!"
ENV KEYSTORE_PASSWORD=$API_PASSWORD

ADD ./run.sh /

ENTRYPOINT /run.sh
