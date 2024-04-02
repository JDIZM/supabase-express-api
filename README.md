# node-express-backend-component

- [tsx](https://github.com/esbuild-kit/tsx)
- [pkgroll](https://github.com/privatenumber/pkgroll)
- [eslint](https://eslint.org/)
- [prettier](https://prettier.io/)
- [typescript](https://www.typescriptlang.org/)
- [vitest](https://vitest.dev/)
- [drizzle](https://orm.drizzle.team/)
- [postgres](https://www.postgresql.org/)
- [zod](https://zod.dev/)
- [drizzle-zod](https://orm.drizzle.team/docs/zod)
  - [drizzle with supabase](https://orm.drizzle.team/docs/get-started-postgresql#supabase)
- [drizzle-kit](https://orm.drizzle.team/kit-docs/overview)
- [supabase](https://supabase.io/)
  - [supabase-js](https://supabase.com/docs/reference/javascript/introduction)

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

You can view the database with `npx drizzle-kit studio` or `npm run studio`

### Migrations

When the schema/model is changed make sure to create a new migration and run it against the db.

1. Create a new migration

<!-- TODO create a named migration and pass additional flag to npm. -->

```
npm run migrate:create

```

2. Run the migrations

```
npm run migrate:up
```

### Seeds

You can run the seeds to populate the database with initial data.

Before seeding the db make sure to run the migrations. If you want to populate the seeds with specific user email, password or id's related to the users created in Supabase. You can update the seeds in `./src/seeds/` with the required data and make sure to pass the `--supabase=true` flag to the seed command and it will create the users in Supabase and associate the id's with the db records.

Note: If you are creating users with Supabase you will need to confirm the email addresses.

```
npm run seed
```

Be sure to update the seeds as new migrations are added.

## Import aliases

Aliases can be configured in the import map, defined in package.json#imports.

see: https://github.com/privatenumber/pkgroll#aliases

## Authentication

This project uses JWT bearer token for authentication. The claims, id and sub must be set on the token and the token can be verified and decoded using the configured auth provider.

## Permissions

How permissions work.

A resource will have a permission level. A user will have a role/claim.

Routes will have their permission level defined in `./src/helpers/permissions.ts`

When a user makes a request to a route the route will check the user's role/claim against the permission level of the resource.

### Route permission levels

1. Owner - Route can only be accessed by the owner of the resource. Defined by the id of the resource being accessed matching the id of the user making the request.
2. User - Can access all resources with user permissions.
3. Admin - Can access all resources.

### Claims / Roles

A claim is defined when the user is created which defines the user's role and permissions level.

1. User - default user permissions
2. Admin - admin permissions

## Deployment

<!-- TODO add deployment steps.. -->
