/**
 * Metro config — extend defaults so `require('.../*.ogg')` is treated as
 * an asset (not source). The Kenney audio pack ships as OGG; without this
 * Metro rejects the require at bundle time.
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
if (!config.resolver.assetExts.includes('ogg')) {
  config.resolver.assetExts.push('ogg');
}

module.exports = config;
