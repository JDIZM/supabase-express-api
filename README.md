# node-express-backend-component

- [tsx](https://github.com/esbuild-kit/tsx)
- [pkgroll](https://github.com/privatenumber/pkgroll)
- [eslint](https://eslint.org/)
- [prettier](https://prettier.io/)
- [typescript](https://www.typescriptlang.org/)
- [vitest](https://vitest.dev/)
- [zod](https://zod.dev/)
- [drizzle](https://orm.drizzle.team/)
  - [drizzle with supabase](https://orm.drizzle.team/docs/get-started-postgresql#supabase)
- [drizzle-zod](https://orm.drizzle.team/docs/zod)
- [drizzle-kit](https://orm.drizzle.team/kit-docs/overview)
- [postgres](https://www.postgresql.org/)
- [supabase](https://supabase.io/)
  - [supabase-js](https://supabase.com/docs/reference/javascript/introduction)
- [helmet](https://helmetjs.github.io/)
- [cookie-parser](https://www.npmjs.com/package/cookie-parser)

A node/express backend API template for getting started with a new project that includes authentication, permissions, and a database configured to
use [Supabase](https://supabase.io/) or a local/cloud Postgres database.

This comes pre-defined with a workspaces model that allows accounts (users) to create workspaces and invite other profiles (users presence within a workspace) to access the workspace (membership). see the [Permissions](#Permissions) section for more information on how permissions are defined.

The contents of a workspace is not defined in this template and can be customized to suit the needs of the project.

## ESM Node

https://www.typescriptlang.org/docs/handbook/esm-node.html

This project has been setup to use ESM Node. This allows us to use ES6 imports in Node.

This uses [tsx](https://github.com/esbuild-kit/tsx) as a dev server and [pkgroll](https://github.com/privatenumber/pkgroll) to bundle and build the project.

## Requirements

This project requires node.js to be installed. This project uses volta to manage node versions.

To install volta run the following command in the terminal.

```
curl https://get.volta.sh | bash
```

You will need a Postgres database to run this project. You can use Docker to run a Postgres database or use a service like [Supabase](https://supabase.com/).

See the [Database](#Database) section for more information on how to configure the database connection.

### ENV

Create a .env file in the root of the project and copy the contents of .env.example into it.

```
cp .env.example .env
```

see the section on [Deployment with DigitalOcean](#deployment-with-digitalocean) for more information on how to configure the environment variables for deployment in different environments (eg. development and production).

### Install dependencies

```
# install dependencies
npm i
```

## Testing

This project uses [vitest](https://vitest.dev/) for unit testing.

Run the unit tests with `npm run test`

It's also recommended to install the [vitest extension for vscode](https://marketplace.visualstudio.com/items?itemName=ZixuanChen.vitest-explorer).

## Supabase CLI

You can install the supabase cli for local development.

- https://supabase.com/docs/guides/cli/getting-started
- https://supabase.com/docs/guides/cli/local-development

## Database

You can view the database with `npx drizzle-kit studio` or `npm run studio`.

You can spin up a local copy of the database and application with `docker-compose` but this is not required when using the Supabase db.
When using the supabase cli we can run a local copy of the db with `supabase start`.

### Developing locally with supabase

This will provide you with a connection string, you can update the local environment variables in the .env file with the details from the connection string.

`postgresql://postgres:postgres@localhost:54322/postgres`

Visit the Supabase dashboard: http://localhost:54323 and manage your database locally.

### Local Postgres with Docker

You can spin up a local database and application with `docker-compose` but this is not required when using the Supabase db or cli.

```
docker compose up -d
```

Alternatively you can create a local network and connect the containers to the network.

```bash
docker network create mynetwork

docker run --network mynetwork --name mypostgres -d -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=example -e POSTGRES_DB=postgres postgres:15
```

Then when running the application in docker you can connect to the database with the container name.

```bash
POSTGRES_HOST=mypostgres
```

Then run the application in docker and connect to the same network.

```bash
docker run --network mynetwork --name node-express -d -p 4000:4000 node-express
```

Note: If you are using a local database and running the application within docker on the host machine you will need to set `POSTGRES_HOST=host.docker.internal` in the .env file. [Read the docs for more info](https://docs.docker.com/desktop/networking/#i-want-to-connect-from-a-container-to-a-service-on-the-host)

### Migrations

When the schema/model is changed make sure to create a new migration and run it against the db.

1. Create a new migration

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

## Build with docker

```
# build the app
npm run build

# build with docker
docker build . --tag node-express

# or to build with a specific platform
docker build . --tag node-express --platform linux/amd64

# or build a specific stage eg dev
docker build . --target dev --tag node-express

# start the docker container
docker run -d -p 4000:4000 node-express

# view it running on localhost
curl localhost:4000
```

## Import aliases

Aliases can be configured in the import map, defined in package.json#imports.

see: https://github.com/privatenumber/pkgroll#aliases

## Authentication

This project uses JWT bearer token for authentication. The claims, id and sub must be set on the token and the token can be verified and decoded using the configured auth provider.

## Permissions

How permissions work.

A resource will have a permission level for each route method based on users role within the workspace. Workspace permissions can be defined in `./src/helpers/permissions.ts`.

Workspace level permissions:
Admin: Highest level of access to all resources within the workspace.
User: Regular user with limited permissions.

Resource level permissions:
Owner: Has access to their own resources

Account level permissions:
SuperAdmin: Has access to all super only resources.

### Workspace route permission levels

Ensure every request that requires workspace permissions includes a workspace context.

This can be done by passing the `x-workspace-id` header when making a request.

This will allow the user to access the workspace resources if they are a member of the workspace with a sufficient role.

A role/claim is defined when the account is added to the workspace as a member.

1. User - Can access all resources with user permissions.
2. Admin - Can access all resources within the workspace.

## Supabase Auth

see the [documentation for more information](https://supabase.com/docs/reference/javascript/auth-api) on how to use Supabase Auth with this project.

## Deployment with DigitalOcean

A docker image can be built and deployed to a [container registry](https://docs.digitalocean.com/products/container-registry/getting-started/quickstart/). We can configure DigitalOcean to deploy the image once the registry updates using their [App Platform](https://docs.digitalocean.com/products/app-platform/)

The following secrets will need to be added to Github Actions for a successful deployment to DigitalOcean.

### Environment variables for deployment

- `DIGITALOCEAN_ACCESS_TOKEN` https://docs.digitalocean.com/reference/api/create-personal-access-token/
- `REGISTRY_NAME` eg registry.digitalocean.com/my-container-registry
- `IMAGE_NAME` the name of the image we are pushing to the repository eg `express-api` it will be tagged with the latest version and a github sha.

### App level environment variables

For information on confguring the app level environment variables see [How to use environment variables in DigitalOcean App Platform](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/)

- `NODE_ENV`: `production`
- `APP_URL`: `https://api.example.com`
- `POSTGRES_HOST`: `<region>.pooler.supabase.com`
- `POSTGRES_USER`: `postgres.<supabase-id>`
- `POSTGRES_PASSWORD`: `example`
- `POSTGRES_DB`: `postgres`
- `SUPABASE_URL`: `https://<supabase-id>.supabase.co`
- `SUPABASE_PK`: `abcdefghijklm`
