# @baggy/example-express-s3

An example on how to configure baggy using express and the s3 storage provider

To run this example, start the s3 mock using localstack.
Requirements:

- [docker](https://www.docker.com/)
- [docker-compose](https://docs.docker.com/compose/install/)
- [awslocal](https://github.com/localstack/awscli-local) - cli wrapper for awscli for localstack

## Start up

- In the repository root, run `make aws-mock` to start up localstack.
- After localstack is ready, run `make aws-bucket` to create the sample bucket.
- Run `yarn serve-s3` to start up the express server

Then you can run npm and yarn commands against `registry=http://localhost:3000`

## Tear down

Run `make aws-clean` to shut down the server and remove containers and artifacts
