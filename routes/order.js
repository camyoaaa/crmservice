var express = require("express");
var router = express.Router();

var neworderModel = require("../models/neworder");
var userModel = require("../models/user");
var messageModel = require("../models/message");
var stautsModel = require('../models/customstatus');
var customModel = require('../models/custom');
var afterSalesModel = require('../models/aftersale');



const {
    reviewStatusList,
    appRoleList
} = require('../config');
const {
    generateConditions,
    getDataStatisticsTime
} = require("../tool");

/* GET users listing. */
router.get("/", async function (req, res, next) {
    res.send("respond with a resource");


});

//获取订单详情
router.get("/detail", async function (req, res, next) {
    try {
        let orderDetail = await neworderModel.aggregate([{
                $match: {
                    oid: Number(req.query.oid)
                }
            },
            { //关联创建人信息
                $lookup: {
                    from: 'Users',
                    localField: 'creator',
                    foreignField: 'account',
                    as: 'creatorInfo'
                }
            },
            {
                $unwind: '$creatorInfo'
            },
            { //关联用户信息
                $lookup: {
                    from: 'Customs',
                    localField: 'cid',
                    foreignField: 'cid',
                    as: 'customInfo'
                }
            },
            {
                $unwind: '$customInfo'
            },
            { //关联套餐信息
                $lookup: {
                    from: 'Meals',
                    localField: 'mid',
                    foreignField: 'mid',
                    as: 'mealInfo'
                }
            },
            {
                $unwind: '$mealInfo'
            },
            { //关联售后信息
                $lookup: {
                    from: 'Aftersales',
                    localField: 'oid',
                    foreignField: 'orderid',
                    as: 'aftersales'
                }
            },
            {
                $unwind: '$aftersales'
            },
            { //关联收据信息
                $lookup: {
                    from: 'Payreceipts',
                    localField: 'oid',
                    foreignField: 'orderid',
                    as: 'payreceiptList'
                }
            },
            { //关联合同信息
                $lookup: {
                    from: 'Newcontracts',
                    localField: 'oid',
                    foreignField: 'orderid',
                    as: 'contractList'
                }
            }
        ])
        console.log(orderDetail);
        res.json({
            status: 200,
            msg: '查新成功',
            data: orderDetail[0]
        });
    } catch (error) {

    }


});


//新增订单
router.post("/add", async function (req, res, next) {
    try {
        let addSuccess = await neworderModel.create(req.body);
        let createAfterSaleRecord = await afterSalesModel.create({
            orderid: addSuccess.oid,
            cid: addSuccess.cid,
            remark: addSuccess.remark
        });

        let sender = await userModel.findOne({
            account: req.userid
        });
        let messageBody = {
            from: req.userid,
            to: appRoleList.find(r => r.name === '售后经理').id,
            message: `【新订单/${addSuccess.oid}】 请您尽快分配售后处理哦`,
            time: Date.now()
        }
        let socketBody = {
            type: 'newOrder',
            id: addSuccess.oid,
            message: sender.name,
            description: messageBody.message,
            icon: sender.avatar
        }
        res.userSocket().sendMessage({
            to: 'aftersaleManager',
            messageBody,
            socketBody
        });

        if (createAfterSaleRecord) {
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

router.get("/list", async function (req, res, next) {
    let {
        pageNo,
        pageSize,
        startTime,
        endTime,
        fuzzies, //模糊查询字段数组
        ...filters
    } = req.query;

    let reviewPassedStatus = reviewStatusList.find(r => r.name === '审核通过').id;
    try {
        let filteredConditions = generateConditions(filters, fuzzies, {
            toNumber: ['oid', 'cid', 'mid', 'creator', 'distributor', 'lastExecutor', 'executor']
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
        const [totalCount, list] = await Promise.all([
            neworderModel.countDocuments(filteredConditions),
            neworderModel.aggregate([{
                    $match: filteredConditions,
                }, {
                    $lookup: { //关联套餐信息
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
                    },
                },
                {
                    $addFields: {
                        mealName: {
                            $ifNull: ['$mealInfo.name', '']
                        }
                    },
                },
                {
                    $lookup: { //关联客户信息
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
                    },
                },
                {
                    $addFields: {
                        customName: {
                            $ifNull: ['$customInfo.name', '']
                        }
                    },
                },
                { //关联收款单据信息
                    $lookup: {
                        from: 'Payreceipts',
                        localField: 'oid',
                        foreignField: 'orderid',
                        as: 'payList'
                    }
                },
                {
                    $addFields: {
                        paidTotal: {
                            $reduce: {
                                input: '$payList',
                                initialValue: 0,
                                in: {
                                    $add: ["$$value", "$$this.money"]
                                }
                            }
                        },
                        paidPassed: {
                            $reduce: {
                                input: '$payList',
                                initialValue: 0,
                                in: {
                                    $add: ["$$value", {
                                        $cond: {
                                            if: {
                                                $eq: ["$$this.status", reviewPassedStatus]
                                            },
                                            then: "$$this.money",
                                            else: 0
                                        }
                                    }]
                                }
                            }
                        }
                    }
                },
                { //关联合同信息
                    $lookup: {
                        from: 'Newcontracts',
                        localField: 'oid',
                        foreignField: 'orderid',
                        as: 'contractList'
                    }
                },
                {
                    $addFields: {
                        contract: {
                            $ifNull: [{
                                $arrayElemAt: ['$contractList', 0]
                            }, {}]
                        }
                    }
                },
                { //关联创建人
                    $lookup: {
                        from: 'Users',
                        localField: 'creator',
                        foreignField: 'account',
                        as: 'creatorInfo'
                    }
                },
                {
                    $unwind: '$creatorInfo'
                },
                {
                    $addFields: {
                        creatorName: '$creatorInfo.name'
                    }
                },
                { //关联分配人(售后经理)
                    $lookup: {
                        from: 'Users',
                        localField: 'distributor',
                        foreignField: 'account',
                        as: 'distributorList'
                    }
                },
                {
                    $addFields: {
                        distributorInfo: {
                            $ifNull: [{
                                $arrayElemAt: ["$distributorList", 0]
                            }, {}]
                        }
                    }
                },
                {
                    $addFields: {
                        distributorName: {
                            $ifNull: ['$distributorInfo.name', '']
                        }
                    }
                },
                { //关联上一售后
                    $lookup: {
                        from: 'Users',
                        localField: 'lastExecutor',
                        foreignField: 'account',
                        as: 'lastExecutorList'
                    }
                },
                {
                    $addFields: {
                        lastExecutorInfo: {
                            $ifNull: [{
                                $arrayElemAt: ["$lastExecutorList", 0]
                            }, {}]
                        }
                    }
                },
                {
                    $addFields: {
                        lastExecutorName: {
                            $ifNull: ['$lastExecutorInfo.name', '']
                        }
                    }
                },
                { //关联售后
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
                                $arrayElemAt: ["$executorList", 0]
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
                {
                    $project: {
                        creatorInfo: 0,
                        mealList: 0,
                        mealInfo: 0,
                        customList: 0,
                        customInfo: 0,
                        contractList: 0,
                        distributorList: 0,
                        distributorInfo: 0,
                        lastExecutorList: 0,
                        lastExecutorInfo: 0,
                        executorList: 0,
                        executorInfo: 0,
                        _id: 0,
                        __v: 0
                    }
                }

            ]).sort({
                createTime: -1
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
        console.log('error*********************************', error);
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


//获取支付审核通过的订单
router.get('/paidPassedOrderList', async function (req, res) {
    let {
        pageNo,
        pageSize,
        fuzzies, //模糊查询字段数组
        ...filters
    } = req.query;
    try {
        let filteredConditions = generateConditions({
            ...filters
        }, fuzzies, {
            toNumber: ['cid', 'oid', 'distributor', 'executor']
        });
        const [totalCount, list] = await Promise.all([
            neworderModel.countDocuments(filteredConditions),
            neworderModel.aggregate([{
                    $match: filteredConditions,
                }, {
                    $lookup: {
                        from: 'Customs',
                        localField: 'cid',
                        foreignField: 'cid',
                        as: 'customInfo'
                    }
                },
                {
                    $unwind: '$customInfo'
                },
                {
                    $lookup: {
                        from: 'Meals',
                        localField: 'mid',
                        foreignField: 'mid',
                        as: 'mealInfo'
                    }
                },
                {
                    $unwind: '$mealInfo'
                },
                {
                    $lookup: {
                        from: 'Users',
                        localField: 'distributor',
                        foreignField: 'account',
                        as: 'distributorInfo'
                    }
                },
                {
                    $lookup: {
                        from: 'Users',
                        localField: 'executor',
                        foreignField: 'account',
                        as: 'executorInfo'
                    }
                },
                {
                    $lookup: {
                        from: 'Newcontracts',
                        localField: 'oid',
                        foreignField: 'orderid',
                        as: 'contractList'
                    }
                },
                {
                    $lookup: {
                        from: 'Payreceipts',
                        localField: 'oid',
                        foreignField: 'orderid',
                        as: 'payreceiptList'
                    }
                },
                {
                    $lookup: {
                        from: 'Followrecords',
                        localField: 'oid',
                        foreignField: 'oid',
                        as: 'followList'
                    }
                },
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
        console.log('error*********************************', error);
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

//升级订单
router.put("/upgrade", async function (req, res, next) {
    const {
        orderid,
        ...payload
    } = req.body;
    try {
        let updateSuccess = await neworderModel.updateOne({
            oid: orderid
        }, {
            $set: {
                ...payload,
                upgradeTime: Date.now()
            }
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

//取消订单
router.delete("/delete", async function (req, res, next) {
    try {
        let result = await neworderModel.deleteOne({
            oid: req.body.orderid
        });
        if (result) {
            res.json({
                status: 200,
                msg: "取消成功"
            });
        }
    } catch (error) {
        res.json({
            status: 400,
            msg: error.message
        });
    }
});

//更新订单

router.put('/update', async (req, res) => {
    try {
        let {
            oids,
            ...payload
        } = req.body;

        let toNumber = ['distributor', 'executor', 'allocTime', 'upgradeTime']
        for (const key in payload) {
            if (toNumber.includes(key)) {
                payload[key] = Number(payload[key])
            }
        }
        let updateOrderRecord = await neworderModel.updateMany({
            oid: {
                $in: oids
            }
        }, {
            $set: payload
        });
        console.log('updateOrderRecord', oids, payload, updateOrderRecord);
        res.isuccess();
    } catch (error) {
        console.log(error)
        res.ierror(error)
    }

});

//分配订单
router.put("/alloc", async function (req, res, next) {
    let {
        oid,
        ...payload
    } = req.body;
    try {
        let createMs = Date.now(); //现在准备分配的时间
        let DataStatisticsTime = getDataStatisticsTime(); //任务统计时间

        let executor = Number(payload.executor);
        let distributor = Number(payload.distributor);

        let findExecutor = await userModel.findOne({
            account: executor
        });
        let reset = createMs >= DataStatisticsTime && findExecutor.lastTaskTime < DataStatisticsTime; //如果本次分配时间是今天,且上次分配时间是昨天,那么重置该员工的分配数量

        let updatePipes = reset ? {
            $set: {
                lastTaskTime: createMs,
                todayRecepted: 1
            }
        } : {
            $set: {
                lastTaskTime: createMs
            },
            $inc: {
                todayRecepted: 1
            }
        };

        userModel.updateOne({
            account: executor
        }, updatePipes).then((result) => {
            console.log("------------------------------------", result)
        });

        let updateOrderRecord = await neworderModel.findOneAndUpdate({ //更新订单
            oid
        }, {
            $set: {
                ...payload,
                allocTime: Date.now()
            }
        });

        let sender = await userModel.findOne({
            account: distributor
        });
        let messageBody = {
            from: distributor,
            to: executor,
            message: `【订单售后/${oid}】 已经分配给你啦,请你跟进哦`,
            time: Date.now()
        }
        let socketBody = {
            type: 'newAftersale',
            id: oid,
            message: sender.name,
            description: messageBody.message,
            icon: sender.avatar
        }
        res.userSocket(executor).sendMessage({
            messageBody,
            socketBody
        });
        updateOrderRecord && res.isuccess();
    } catch (error) {
        res.ierror(error);
    }
});



module.exports = router;