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

Note: Prisma does not support ESM by default and [have an open issue](https://github.com/prisma/prisma/issues/5030) -- looking to migrate this to another ORM (drizzle) for ESM support

## Setup

```
# install dependencies
npm i

# start the dev server
npm run dev

# view it running on localhost
curl localhost:3000
```

## Testing

This project uses [vitest](https://vitest.dev/) for testing.

1. run the unit tests with `npm run test`

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

## Database

```
# after updating the model you want to generate the schema
npx prisma generate
```

### env

create a .env file in the root of the project and copy the contents of .env.example into it.

You can replace `DATABASE_URL` with your mongodb connection string whether that be cloud or locally hosted.

Note: when using Prisma the MongoDB database connector uses transactions to support nested writes. Transactions require a replica set deployment. The easiest way to deploy a replica set is with Atlas. It's free to get started.

https://www.prisma.io/docs/concepts/database-connectors/mongodb

### seed the db

run the seed script to seed the db the first time.

```bash
npx prisma db seed
```

## Import aliases

Aliases can be configured in the import map, defined in package.json#imports.

see: https://github.com/privatenumber/pkgroll#aliases
