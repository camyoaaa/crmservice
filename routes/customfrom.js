var express = require("express");
var router = express.Router();

var customfromModel = require("../models/customfrom");
const {
    recordStatus
} = require('../config')
const {
    generateConditions
} = require("../tool");


/* GET users listing. */
router.get("/", function (req, res, next) {
    res.send("respond with a resource");
});

router.post("/add", async function (req, res, next) {
    try {
        let addSuccess = await customfromModel.create(req.body);
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
    let {
        pageNo,
        pageSize,
        fuzzies, //模糊查询字段数组
        ...filters
    } = req.query;
    try {
        let filteredConditions = generateConditions(filters, fuzzies);
        const [totalCount, list] = await Promise.all([
            customfromModel.countDocuments(filteredConditions),
            customfromModel
            .find(filteredConditions)
            .sort({
                _id: -1
            })
            .skip((Number(pageNo) - 1) * Number(pageSize))
            .limit(Number(pageSize))
            .select({
                __v: 0,
                _id: 0
            })
        ]);
        if (true) {
            res.json({
                status: 200,
                message: "获取成功",
                timestamp: Date.now(),
                result: {
                    pageNo: Number(pageNo),
                    pageSize: Number(pageSize),
                    totalCount,
                    totalPage: Math.ceil(totalCount / pageSize),
                    data: list
                }
            });
        }
    } catch (error) {
        console.log(error);
        res.json({
            status: 500,
            message: "获取失败",
            timestamp: Date.now(),
            result: {
                pageNo,
                pageSize,
                totalCount: 0,
                totalPage: 0,
                data: []
            }
        });
    }
});

router.put("/update", async function (req, res, next) {
    const {
        oid,
        ...payload
    } = req.body;
    try {
        let updateSuccess = await customfromModel.updateOne({
            oid
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

//删除客户来源
router.delete("/delete", async function (req, res, next) {
    try {
        let result = await customfromModel.deleteOne({
            oid: req.body.oid
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