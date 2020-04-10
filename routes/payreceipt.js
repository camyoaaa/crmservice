var express = require("express");
var router = express.Router();

var payreceiptModel = require("../models/payreceipt");
var userModel = require("../models/user");

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

router.get("/list", async function (req, res, next) {
    let {
        pageNo,
        pageSize,
        userid,
        fuzzies, //模糊查询字段数组
        ...filters
    } = req.query;
    try {
        let filteredConditions = generateConditions(filters, fuzzies, {
            toNumber: ['creator', 'reviewer', 'payreceiptid', 'status']
        });
        console.log(filteredConditions);
        const [totalCount, list] = await Promise.all([
            payreceiptModel.countDocuments(filteredConditions),
            payreceiptModel.aggregate([{
                    $match: filteredConditions
                },
                {
                    $lookup: {
                        from: 'Users',
                        localField: 'creator',
                        foreignField: 'account',
                        as: 'creatorInfo'
                    },
                }, {
                    $unwind: '$creatorInfo'
                },
                {
                    $lookup: {
                        from: 'Users',
                        localField: 'reviewer',
                        foreignField: 'account',
                        as: 'reviewer'
                    },
                }
            ]).sort({
                _id: -1
            })
            .skip((Number(pageNo) - 1) * Number(pageSize))
            .limit(Number(pageSize))
        ]);
        if (Array.isArray(list)) {
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
        payreceiptids,
        ...payload
    } = req.body;
    try {
        let updateSuccess = await payreceiptModel.updateMany({
            payreceiptid: {
                $in: payreceiptids
            }
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