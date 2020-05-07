var express = require("express");
var router = express.Router();

var aftersaleModel = require("../models/aftersale");
var neworderModel = require("../models/neworder");
const {
    generateConditions
} = require("../tool");

/* GET users listing. */
router.get("/", async function (req, res, next) {});


//添加一条售后记录
router.post("/add", async function (req, res, next) {
    try {
        let addSuccess = await aftersaleModel.create(req.body);
        if (addSuccess) {
            res.json({
                status: 200,
                msg: "新增成功",
                oid: addSuccess.oid
            });
        }
    } catch (error) {
        console.log(error);
    }
});


//获取售后记录列表
router.get("/list", async function (req, res, next) {
    let {
        pageNo = 1,
            pageSize = 10,
            startTime,
            endTime,
            url,
            fuzzies, //模糊查询字段数组
            ...filters
    } = req.query;
    try {
        let filteredConditions = generateConditions({
            ...filters
        }, fuzzies, {
            toNumber: ['orderid', 'executor', 'cid', 'isOpen', 'teachStep', 'isEnd']
        });
        if (startTime && endTime) { //传入了时间
            filteredConditions.$and = [{
                    'createTime': {
                        $gt: Number(startTime)
                    }
                }, {
                    'createTime': {
                        $lt: Number(endTime)
                    }
                }

            ]
        }
        if (url) {
            filteredConditions.$or = [{
                    pcshopUrl: new RegExp(url)
                },
                {
                    mbshopUrl: new RegExp(url)
                }
            ]
        }
        console.log(filteredConditions);
        const result = await neworderModel.aggregate([{ //关联售后记录
                $lookup: {
                    from: 'Aftersales',
                    localField: 'oid',
                    foreignField: 'orderid',
                    as: 'aftersaleList'
                }
            },
            {
                $addFields: {
                    aftersaleInfo: {
                        $ifNull: [{
                            $arrayElemAt: ['$aftersaleList', 0]
                        }, {}]
                    }
                }
            },
            {
                $replaceRoot: { //把售后信息提到第一层
                    newRoot: {
                        $mergeObjects: [{
                            _id: "$_id",
                            oid: '$oid',
                            premids: '$premids',
                            mid: '$mid',
                            money: "$money",
                            creator: '$creator',
                            distributor: "$distributor",
                            lastExecutor: '$lastExecutor',
                            executor: '$executor',
                            remark: '$remark',
                            createTime: "$createTime",
                            allocTime: "$allocTime",
                            upgradeTime: '$upgradeTime',
                            doneTime: "$doneTime"
                        }, "$aftersaleInfo"]
                    }
                }
            },
            { //关联套餐信息
                $lookup: {
                    from: 'Meals',
                    localField: 'mid',
                    foreignField: 'mid',
                    as: 'mealList'
                }
            },
            {
                $addFields: {
                    mealInfo: {
                        $ifNull: [{
                            $arrayElemAt: ['$mealList', 0]
                        }, {}]
                    }
                }
            },
            { //关联跟进记录
                $lookup: {
                    from: 'Followrecords',
                    localField: 'oid',
                    foreignField: 'oid',
                    as: 'followList'
                }
            },
            { //关联订单的客户信息
                $lookup: {
                    from: 'Customs',
                    localField: 'cid',
                    foreignField: 'cid',
                    as: 'customList'
                }
            },
            {
                $addFields: {
                    customInfo: {
                        $ifNull: [{
                            $arrayElemAt: ['$customList', 0]
                        }, {}]
                    }
                }
            },
            { //关联订单的负责人信息
                $lookup: {
                    from: 'Users',
                    localField: 'executor',
                    foreignField: 'account',
                    as: 'executorList'
                }
            },
            {
                $addFields: {
                    executorInfo: {
                        $ifNull: [{
                            $arrayElemAt: ['$executorList', 0]
                        }, {}]
                    }
                }
            },
            {
                $addFields: {
                    executorName: {
                        $ifNull: ['$executorInfo.name', '']
                    }
                }
            },
            { //关联订单的收款信息
                $lookup: {
                    from: 'Payreceipts',
                    localField: 'oid',
                    foreignField: 'orderid',
                    as: 'payreceiptList'
                }
            },
            {
                $project: {
                    customList: 0,
                    mealList: 0,
                    executorList: 0,
                    executorInfo: 0
                }
            },
            {
                $match: filteredConditions
            },
            {
                $facet: {
                    count: [{
                        $count: "count"
                    }],
                    page: [{
                            $skip: (Number(pageNo) - 1) * Number(pageSize)
                        },
                        {
                            $limit: Number(pageSize)
                        }
                    ]
                }
            }
        ]);
        console.log(result);
        res.json({
            status: 200,
            message: "获取成功",
            timestamp: Date.now(),
            result: {
                pageNo: Number(pageNo),
                pageSize: Number(pageSize),
                totalCount: result[0].count[0].count,
                totalPage: Math.ceil(result[0].count[0].count / pageSize),
                data: result[0].page
            }
        });
    } catch (error) {
        console.log(error)
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

//更新售后记录
router.put("/update", async function (req, res, next) {
    let {
        rid,
        ...payload
    } = req.body;
    payload.updateTime = Date.now();
    try {
        let updateSuccess = await aftersaleModel.updateOne({
            rid: Number(rid)
        }, {
            $set: payload
        }, {
            upsert: true //如果不匹配则创建文档
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

module.exports = router;