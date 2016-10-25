var express = require('express');
var router = express.Router();

let credentials = require('../credentials')

/*
GET home page. This is used just as a visual check to make sure the server is up.
*/
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


module.exports = router;
