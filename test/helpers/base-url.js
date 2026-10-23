require('dotenv').config();

const baseUrl = (process.env.DVWS_BASE_URL ||
  `http://127.0.0.1:${process.env.EXPRESS_JS_PORT || 80}`).replace(/\/$/, '');

module.exports = baseUrl;
