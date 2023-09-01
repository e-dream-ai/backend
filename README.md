### e-dream.ai backend
## How to run
- `npm ci` - To install all packagees based on the actual package-lock.json
- `npm run dev` - To run on dev mode

## Deployment process
- If you push something to stage branch, this will be deployed to staging environment
- If you create an tag, this one will be deployed to production

### Running it locally
- Run `cp .env.example .env`
- Install Docker
- Run `docker compose -f "docker-compose.yml" up -d --build`