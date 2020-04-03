var express = require("express");
var router = express.Router();
var moment = require("moment");

var postModel = require("../models/post");

const {
    recordStatus
} = require('../config');


/* GET users listing. */
router.get("/", function (req, res, next) {
    res.send("respond with a resource");
});

router.post("/add", async function (req, res, next) {
    try {
        let addSuccess = await postModel.create({
            ...req.body,
            status: recordStatus.Enable
        });
        if (addSuccess) {
            res.json({
                status: 200,
                msg: "新增成功"
            });
        }
    } catch (error) {
        console.log(error);
    }
});

router.get("/list", async function (req, res, next) {
    try {
        let list = await postModel.find({
            did: Number(req.query.did),
            status: recordStatus.Enable
        });
        if (list) {
            res.json({
                status: 200,
                msg: "获取成功",
                data: list
            });
        }
    } catch (error) {
        console.log(error);
    }
});

router.put("/update", async function (req, res, next) {
    const {
        pid,
        ...payload
    } = req.body;
    try {
        let updateSuccess = await postModel.updateOne({
            pid
        }, {
            $set: payload
        });

        if (updateSuccess) {
            res.json({
                status: 200,
                msg: "更新成功"
            });
        }
    } catch (error) {
        console.log(error);
        res.json({
            status: 500,
            msg: "更新失败"
        });
    }
});

//用户登出
router.delete("/delete", async function (req, res, next) {
    try {
        let result = await postModel.remove({
            pid: {
                $in: req.body.pids
            }
        });
        if (result) {
            res.json({
                status: 200,
                msg: "更新成功"
            });
        }
    } catch (error) {
        res.json({
            status: 400,
            msg: error.message
        });
    }
});


module.exports = router;