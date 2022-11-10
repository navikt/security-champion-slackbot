FROM node:18-alpine AS runtime

WORKDIR /usr/src/app

COPY package*.json /usr/src/app/
RUN npm ci
COPY . /usr/src/app
RUN npm run build

USER node

CMD ["npm", "run", "sync"]
