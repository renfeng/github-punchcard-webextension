#!/usr/bin/env bash
pushd $(dirname $0)

npm i

mkdir -p build

# meta
cp src/manifest.json build/

# Icon cannot be hidden. see https://stackoverflow.com/questions/13040955/can-i-hide-my-extensions-icon-by-default
cp src/icon.png build/

cp src/background.js build/

cp src/content.js build/
cp src/PunchCard.js build/

#cp src/sw.js build/
cp src/background.png build/

# https://github.com/PolymerLabs/crisper#usage-with-vulcanize
vulcanize src/options.html --inline-script | crisper --html build/options.html --js build/options.js
vulcanize src/popup.html --inline-script | crisper --html build/popup.html --js build/popup.js

# test page
vulcanize test.html --inline-script | crisper --html build/test.html --js build/test.js
cp node_modules/jasmine-core/images/jasmine_favicon.png build/
cp node_modules/jasmine-core/lib/jasmine-core/jasmine.css build/
sed -i "" s~node_modules/jasmine-core/images/~~g build/test.html
sed -i "" s~node_modules/jasmine-core/lib/jasmine-core/~~g build/test.html

rm github-punchcard.zip
pushd build
zip ../github-punchcard.zip *
popd

echo
echo "Chrome Web Store - Select Edit, upload the new package, and hit Publish."
echo "https://chrome.google.com/webstore/developer/edit/bpbennifjflmjcnoofbeaoiffphdbbad"
echo
echo "Add-ons for FireFox - Upload New Version"
echo "https://addons.mozilla.org/en-US/developers/addon/github-punchcard/edit"
echo

popd
