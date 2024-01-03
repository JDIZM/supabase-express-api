# node-express-backend-component

- [tsx](https://github.com/esbuild-kit/tsx)
- [pkgroll](https://github.com/privatenumber/pkgroll)
- [eslint](https://eslint.org/)
- [prettier](https://prettier.io/)
- [typescript](https://www.typescriptlang.org/)
- [vitest](https://vitest.dev/)
- [drizzle](https://orm.drizzle.team/)
- [postgres](https://www.postgresql.org/)

A simple node/express backend api template.

## Requirements

This project requires node.js to be installed. This project uses volta to manage node versions.

To install volta run the following command in the terminal.

```
curl https://get.volta.sh | bash
```

## ESM Node

https://www.typescriptlang.org/docs/handbook/esm-node.html

This project has been setup to use ESM Node. This allows us to use ES6 imports in Node.

This uses [tsx](https://github.com/esbuild-kit/tsx) as a dev server and [pkgroll](https://github.com/privatenumber/pkgroll) to bundle and build the project.

## Setup

```
# install dependencies
npm i

# start the dev server
npm run dev

# view it running on localhost
curl localhost:3000
```

## env

create a .env file in the root of the project and copy the contents of .env.example into it.

## Testing

This project uses [vitest](https://vitest.dev/) for unit testing.

Run the unit tests with `npm run test`

It's also recommended to install the [vitest extension for vscode](https://marketplace.visualstudio.com/items?itemName=ZixuanChen.vitest-explorer).

## Build with docker

```
# build the app
npm run build

# build with docker
docker build . --tag node-express-esm

# or to build with a specific platform
docker build . --tag node-express-esm --platform linux/amd64

# start the docker container
docker run -d -p 3000:3000 node-express-esm

# view it running on localhost
curl localhost:3000`
```

replace the `POSTGRES_HOST` with `host.docker.internal` in the .env file to run the app with docker.

```
POSTGRES_HOST=host.docker.internal
```

## Database

spin up a local copy of the database with docker-compose

```
docker compose up -d
```

You can view the database with `npx drizzle-kit studio`

### Migrations

Create a new migration

<!-- TODO create a named migration and pass additional flag to npm. -->

```
npm run migrate:create

```

Run the migrations

```
npm run migrate:up
```

### Seeds

You can run the seeds to populate the database with initial data.

```
npm run seed
```

Be sure to update the seeds as new migrations are added.

## Import aliases

Aliases can be configured in the import map, defined in package.json#imports.

see: https://github.com/privatenumber/pkgroll#aliases

## Deployment

<!-- TODO add deployment steps.. -->
