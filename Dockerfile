FROM node:6.5.0

MAINTAINER Kurt Lee "kurt@vingle.net"

# Install system programs
RUN apt-get update && apt-get install -y zip build-essential curl openjdk-7-jdk && apt-get clean

# Install additional dependencies
# Took from https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md

# Install latest chrome dev package.
# Note: this installs the necessary libs to make the bundled version of Chromium that Pupppeteer
# installs, work.
RUN apt-get update && apt-get install -y wget --no-install-recommends \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get purge --auto-remove -y curl \
    && rm -rf /src/*.deb

# Configure JAVA HOME
ENV JAVA_HOME /usr/lib/jvm/java-7-openjdk-amd64
