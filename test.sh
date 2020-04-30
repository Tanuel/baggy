#!/bin/bash
set -e

TESTDIR=`realpath $(dirname $0)`
export NPM_CONFIG_CACHE=$(pwd)/.local/.npm
export YARN_CACHE_FOLDER=$(pwd)/.local/.yarn
function switch {
  echo switching to $TESTDIR/$1
  cd $TESTDIR/$1
  echo now running in $PWD
}

rm -rf .local/.yarn
rm -rf .local/.npm
rm -rf .local/artifacts

switch test/publish
cp package.minimal.json package.json

npm version --no-git-tag-version prerelease
npm publish --tag prerelease

npm version --no-git-tag-version prerelease --preid=whatever
npm publish --tag whatever

npm version --no-git-tag-version patch
npm publish --tag latest

switch test/publish-scoped
cp package.minimal.json package.json

npm version --no-git-tag-version minor
npm publish --tag barry-allen

npm version --no-git-tag-version patch
npm publish

npm version --no-git-tag-version major
npm publish --tag latest

echo TAGS
npm dist-tag add no-scope@1.1.1 360-no-scope
npm dist-tag add @local/publish-test@1.1.1 ehwat

switch test/install
echo NPM Install
rm -rf node_modules package-lock.json
npm install --ignore-scripts --force

echo YARN INSTALL
rm -rf node_modules yarn.lock package-lock.json
yarn install --ignore-scripts --force -A
rm -rf ${YARN_CACHE_FOLDER}
rm -rf node_modules yarn.lock package-lock.json
yarn install --ignore-scripts --force --no-cache -A
