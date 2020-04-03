var express = require("express");
var router = express.Router();

var mealModel = require("../models/meal");

const {
    recordStatus
} = require('../config');
const {
    generateConditions
} = require("../tool");

/* GET users listing. */
router.get("/", function (req, res, next) {
    res.send("respond with a resource");
});

router.post("/add", async function (req, res, next) {
    const {
        name,
        price,
        minDeposit,
        content
    } = req.body;
    try {
        console.log(req.body);
        let addSuccess = await mealModel.create({
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
        userid,
        fuzzies, //模糊查询字段数组
        ...filters
    } = req.query;
    try {
        let filteredConditions = generateConditions({
            ...filters,
            status: recordStatus.Enable
        }, fuzzies);
        const [totalCount, list] = await Promise.all([
            mealModel.countDocuments(filteredConditions),
            mealModel
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
        mid,
        ...payload
    } = req.body;
    try {
        let updateSuccess = await mealModel.updateOne({
            mid
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
        let result = await mealModel.updateOne({
            mid: req.body.mid
        }, {
            $set: {
                status: recordStatus.Delete
            }
        });
        console.log(result, typeof req.body.account);
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