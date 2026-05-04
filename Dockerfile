FROM denoland/deno:alpine

# Install SQLite with spatialite extension
RUN apk add --no-cache libspatialite libspatialite-dev

WORKDIR /app

COPY . .

RUN deno install

# Just to keep the container running
CMD ["tail", "-f", "/dev/null"]