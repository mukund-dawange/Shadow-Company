FROM php:8.3-cli-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends git curl unzip libonig-dev && docker-php-ext-install pdo_mysql mbstring && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
