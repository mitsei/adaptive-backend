const express = require('express');

const router = express.Router();

/*
GET home page. This is used just as a visual check to make sure the server is up.
*/
router.get('/', (req, res) => {
  res.render('index', { title: 'Express' });
});


module.exports = router;
