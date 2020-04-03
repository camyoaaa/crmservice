var express = require("express");
var router = express.Router();

var departmentModel = require("../models/department");

const {
    recordStatus
} = require('../config');



/* GET users listing. */
router.get("/", function (req, res, next) {
    res.send("respond with a resource");
});

router.post("/add", async function (req, res, next) {
    try {
        let addSuccess = await departmentModel.create({
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

router.get("/tree", async function (req, res, next) {
    try {
        let tree = await departmentModel.aggregate([{
            $lookup: {
                localField: 'did',
                foreignField: 'did',
                from: 'Posts',
                as: 'children'
            }
        }, {
            $match: {
                status: recordStatus.Enable
            }
        }]);

        if (tree) {
            res.json({
                status: 200,
                message: "获取成功",
                tree
            });
        }
    } catch (error) {
        console.log(error);
        res.json({
            status: 500,
            message: "获取失败",
            tree: []
        });
    }
});

router.put("/update", async function (req, res, next) {
    const {
        bid,
        ...payload
    } = req.body;
    try {
        let updateSuccess = await businessModel.updateOne({
            bid
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
        let result = await departmentModel.updateOne({
            did: {
                $in: req.body.dids
            }
        }, {
            $set: {
                status: recordStatus.Delete
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