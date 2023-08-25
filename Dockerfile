FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

EXPOSE 4000

CMD [ "npm", "run", "start" ]

ENV PORT=4000