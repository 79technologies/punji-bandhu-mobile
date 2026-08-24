module.exports = function (api) {
  // Cache key must include NODE_ENV — with a plain api.cache(true) the first
  // compile's config is reused for every later env, so console stripping
  // silently fails to apply (or applies in dev).
  api.cache.using(() => process.env.NODE_ENV);
  const isProd = process.env.NODE_ENV === 'production';
  return {
    presets: ['babel-preset-expo'],
    // Keep console.error/warn: no crash reporter ships with this app (privacy
    // invariant), so the device log is the only signal when something breaks.
    plugins: isProd
      ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
      : [],
  };
};
