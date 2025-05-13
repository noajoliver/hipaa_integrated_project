/**
 * Middleware index file - exports all middleware
 * @module middleware
 */

const authJwt = require('./auth.jwt');
const audit = require('./audit');
const { apiLimiter, authLimiter, strictLimiter } = require('./rate-limit');
const { checkAccountLock } = require('./account-protection');
const pagination = require('./pagination');

module.exports = {
  authJwt,
  audit,
  apiLimiter,
  authLimiter,
  strictLimiter,
  checkAccountLock,
  pagination
};