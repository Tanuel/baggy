# Baggy NPM Registry

Baggy is a reverse engineered NPM registry with a modular structure.

You can provide your own functionality for storing artifacts and metadata.

## Disclaimer

Baggy is not a production-ready registry. I have started this project for learning purposes
and maybe at some point it can be used for specific setups.
For now unit tests are missing as well as support for a few npm commands.

This Project is als not published on NPM yet.

## Supported npm commands

- [x] install/update/view
- [x] publish
- [x] unpublish
- [x] audit (will proxy to the npm registry)
- [x] ping
- [x] dist-tag
- [x] deprecate
- [ ] login
- [ ] whoami
- [ ] team
- [ ] token
- [ ] search
- [ ] stars
- [ ] star
- [ ] unstar

## Requirements

- [yarn 1.x](https://yarnpkg.com/)
- [node 12.x](https://nodejs.org/en/) (newer versions might work, but are not tested)

## Setup

Clone the registry, then run one of those commands

- `yarn install`
- `yarn serve` to start the express server with filestorage
- `yarn serve-sqlite` to start the express server with sqlite storage

you can now run npm/yarn commands against `http://localhost:3000` by setting the "registry" option

## Development

### Quickstart

1. Run `yarn install` to install dependencies
2. Run `yarn serve` to start express server
3. Open a separate Terminal
4. Run `make test` to execute the test script which will execute a few commands like publish and install

Using `ts-node` and [nodemon](https://www.npmjs.com/package/nodemon)
we can restart the server on any file changes that affect the server.

Files will be to the project root in `.local`. If the directory does not exist, it will be created.

### Formatting

Code will be formatted on commit with `pretty-quick`. Also there is `yarn lint`

## Future Plans

### More providers

Future Providers could be something like these:

- AWS S3 Bucket for Artifacts
- AWS DynamoDB for Metadata
- Other cloud providers

### Authentication

Login should probably not be implemented in the core project (@baggy/registry),
but rather as a kind of middleware for express and other implementations
