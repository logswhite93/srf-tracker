FROM oven/bun:1

WORKDIR /app
COPY package.json .
COPY server.ts .
COPY db.ts .
COPY seed.ts .
COPY seed-data.json .
COPY public/ ./public/

RUN mkdir -p /app/data
RUN bun run seed.ts

EXPOSE 3000
CMD ["bun", "run", "server.ts"]
