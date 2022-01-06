FROM node:16-alpine AS runtime

WORKDIR /usr/src/app

COPY package*.json /usr/src/app/
RUN npm ci
COPY . /usr/src/app

USER node

CMD ["npm", "start"]
