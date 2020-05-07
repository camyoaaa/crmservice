var express = require('express');
var router = express.Router();

var permissionModel = require('../models/permission');

var rolePermissionModel = require('../models/rolePermission');
var config = require('../config');
/* GET home page. */
router.get('/config', function (req, res, next) {
    res.isuccess(config);
});

router.get('/permission', async function (req, res, next) {
    try {
        let result = await permissionModel.aggregate([{
            $group: {
                _id: '$belong',
                belong: {
                    $first: '$belong'
                },
                children: {
                    $push: {
                        pid: '$pid',
                        label: '$label',
                        value: '$value'
                    }
                }
            }
        }]).sort('belong');

        res.isuccess(result);
    } catch (error) {
        console.log(error);
        res.ierror(error);
    }
});

router.get('/rolePermission', async function (req, res, next) {
    try {
        let result = await rolePermissionModel.find({}).sort('_id');
        res.isuccess(result);
    } catch (error) {
        console.log(error);
        res.ierror(error);
    }
});

router.put('/setRolePermission', async function (req, res, next) {
    try {
        let {
            roleEn,
            ...payload
        } = req.body
        let result = await rolePermissionModel.updateOne({
            roleEn
        }, {
            $set: payload
        }, {
            upsert: true
        });
        res.isuccess(result);
    } catch (error) {
        console.log(error);
        res.ierror(error);
    }
});

module.exports = router;