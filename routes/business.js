var express = require("express");
var router = express.Router();

var businessModel = require("../models/business");
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
        let addSuccess = await businessModel.create({
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
    let {
        pageNo,
        pageSize,
        fuzzies, //模糊查询字段数组
        ...filters
    } = req.query;
    try {
        let filteredConditions = generateConditions({
            ...filters,
            status: {
                $ne: recordStatus.Delete
            }
        }, fuzzies);
        const [totalCount, list] = await Promise.all([
            businessModel.countDocuments(filteredConditions),
            businessModel
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
        if (totalCount && Array.isArray(list) && list.length > 0) {
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

//删除业务
router.delete("/delete", async function (req, res, next) {
    try {
        let result = await businessModel.updateOne({
            bid: req.body.bid
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