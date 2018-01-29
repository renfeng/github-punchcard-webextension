#!/usr/bin/env bash
pushd $(dirname $0)

# TODO migrate to npm
bower i

mkdir -p build

# meta
cp src/manifest.json build/
cp src/icon.png build/
cp src/background.js build/
cp src/content.js build/
cp components/github-punchcard/PunchCard.js build/

# options page
# https://github.com/PolymerLabs/crisper#usage-with-vulcanize
vulcanize options.html --inline-script | crisper --html build/options.html --js build/options.js

# test page
vulcanize test.html --inline-script | crisper --html build/test.html --js build/test.js
cp components/jasmine-core/images/jasmine_favicon.png build/
cp components/jasmine-core/lib/jasmine-core/jasmine.css build/
sed -i "" s~components/jasmine-core/images/~~g build/test.html
sed -i "" s~components/jasmine-core/lib/jasmine-core/~~g build/test.html

rm github-punchcard.zip
pushd build
zip ../github-punchcard.zip *
popd

popd
