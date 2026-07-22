export const SAMPLE_COMPOSE = `
services:
  gateway:
    image: nginx:1.27
    ports:
      - "80:80"
    depends_on:
      - api
  api:
    build: ./api
    depends_on:
      - db
      - cache
  db:
    image: postgres:16
  cache:
    image: redis:7
`;
