const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// 1. Ensure .cjs is supported
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

// 2. Disable unstable package exports which often cause internal 
// resolution issues in @react-native-firebase/auth
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './global.css' });
