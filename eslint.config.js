const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expo,
  { ignores: ['ios/**','android/**','dist/**','docs/**','modules/**','scripts/**','**/__tests__/**'] },
]);
