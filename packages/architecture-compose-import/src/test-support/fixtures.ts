/** A representative multi-service Compose document used across tests. */
export const SAMPLE_COMPOSE = `
services:
  gateway:
    image: nginx:1.27
    ports:
      - "80:80"
      - "443:443"
    networks: [edge, app]
    depends_on:
      - api
  api:
    build: ./api
    environment:
      DATABASE_URL: postgres://db:5432/app
      REDIS_URL: redis://cache:6379
    networks: [app]
    depends_on:
      - db
      - cache
      - queue
    ports:
      - "3000"
  db:
    image: postgres:16
    networks: [app]
    volumes:
      - pgdata:/var/lib/postgresql/data
  cache:
    image: redis:7
    networks: [app]
  queue:
    image: rabbitmq:3-management
    networks: [app]
  worker:
    build: ./worker
    depends_on:
      - queue
      - db
    networks: [app]

networks:
  edge:
  app:

volumes:
  pgdata:
`;
