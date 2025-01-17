const mongoose = require('mongoose')
const { DB_URL } = require('./config');

mongoose
    .set("strictQuery", false)
    .connect(`${DB_URL}`, { useNewUrlParser: true })
    .then(() => console.log('DB Connected Successfully'))
    .catch((err) => console.error('Not Connection Error', err));

module.exports = mongoose