// deps
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { isCelebrateError } = require('celebrate');

// local deps
const { attachJSONStringify } = require('./util/error.util');
const { extractCelebrateResponseError } = require('./util/error.v8.util');
const config = require('./config');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.post('/form', async (req, res) => {
  console.log('Got form post!', req.body);
  return res.status(200).json({
    msg: 'success'
  });
});
// static files
app.use('/dist', express.static(path.join(__dirname, 'dist')));
// index.js
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// default error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (isCelebrateError(err)) {
    return res.status(400).json(extractCelebrateResponseError(err));
  }
  if (config.env === 'development') {
    attachJSONStringify(err);
    return res.status(500).json(err);
  }
  return res.status(500).json({
    msg: err.message,
  });
});

app.listen(port, () => {
  console.log(`Tawkify demo v0 listening at http://localhost:${port}`);
});


