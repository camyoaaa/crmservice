var express = require('express');
var router = express.Router();


var config = require('../config');
/* GET home page. */
router.get('/dictionary', function (req, res, next) {
    res.render('index', {
        title: 'Express'
    });

    res.json(config);

});

module.exports = router;