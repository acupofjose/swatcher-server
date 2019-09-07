FROM node:10-alpine

WORKDIR /app

ARG PORT=8080
ENV PORT=${PORT}

COPY package.json .
COPY yarn.lock .

RUN yarn install

COPY . .

EXPOSE ${PORT}

CMD yarn start