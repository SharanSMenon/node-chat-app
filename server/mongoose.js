var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var db = process.env.MONGODB_URI || 'mongodb://localhost:27017/ChatApp'
mongoose.connect(db, {useNewUrlParser:true });
module.exports = {mongoose};