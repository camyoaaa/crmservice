var express = require("express");
var router = express.Router();
var userModel = require("../models/user");
var customModel = require("../models/custom");
var neworderModel = require("../models/neworder");
var customfromModel = require("../models/customfrom");
var payreceiptModel = require("../models/payreceipt");
var newcontractModel = require("../models/newcontract");
var stautsModel = require('../models/customstatus');
const moment = require('moment');

const {
    getDataStatisticsTime
} = require('../tool');

const {
    customStatusList,
    appRoleList,
    reviewStatusList
} = require('../config');

/* GET users listing. */
router.get("/", function (req, res, next) {
    res.send("respond with a resource");
});

//获取header统计信息
router.get("/headerData", async function (req, res, next) {
    try {
        let componyMembersQuery = userModel.countDocuments({});
        //今天新接待的客户
        let todayCustomsQuery = customModel.countDocuments({
            receptTime: {
                $gt: getDataStatisticsTime()
            }
        });
        //今天跟进的客户
        let todayFollowCustomsQuery = customModel.aggregate([{
                $lookup: {
                    from: 'Followrecords',
                    localField: 'cid',
                    foreignField: 'cid',
                    as: 'followList'
                }
            },
            {
                $unwind: '$followList'
            },
            {
                $match: {
                    'followList.createTime': {
                        $gt: getDataStatisticsTime()
                    }
                }
            }
        ]).count('cid');
        //今天成交的订单
        let todayDealOrdersQuery = neworderModel.countDocuments({
            createTime: {
                $gt: getDataStatisticsTime()
            }
        });
        //今天跟进的订单
        let todayFollowOrdersQuery = neworderModel.aggregate([{
                $lookup: {
                    from: 'Followrecords',
                    localField: 'oid',
                    foreignField: 'oid',
                    as: 'followList'
                }
            },
            {
                $unwind: '$followList'
            },
            {
                $match: {
                    'followList.createTime': {
                        $gt: getDataStatisticsTime()
                    }
                }
            }
        ]).count('oid');

        let [componyMembers, todayCustoms, todayFollowCustoms, todayDealOrders, todayFollowOrders] = await Promise.all([componyMembersQuery, todayCustomsQuery, todayFollowCustomsQuery, todayDealOrdersQuery, todayFollowOrdersQuery]);

        res.isuccess({
            componyMembers,
            todayCustoms,
            todayFollowCustoms: todayFollowCustoms[0] ? todayFollowCustoms[0].cid : 0,
            todayDealOrders,
            todayFollowOrders: todayFollowOrders[0] ? todayFollowOrders[0].oid : 0
        });
    } catch (error) {
        res.ierror(error);
    }
});


//获取接待客户信息
router.get('/receiptCustoms', async (req, res) => {
    try {
        let [{
            todayReceipt,
            weekyReceipt,
            monthReceipt,
            totalReceipt
        }] = await customModel.aggregate([{
            $match: {
                receptionist: Number(req.query.account)
            }
        }]).facet({
            todayReceipt: [{
                $match: {
                    receptTime: {
                        $gt: getDataStatisticsTime()
                    }
                }
            }, {
                $count: 'count'
            }],
            weekyReceipt: [{
                $match: {
                    receptTime: {
                        $gt: moment().startOf('week').valueOf()
                    }
                }
            }, {
                $count: 'count'
            }],
            monthReceipt: [{
                $match: {
                    receptTime: {
                        $gt: moment().startOf('month').valueOf()
                    }
                }
            }, {
                $count: 'count'
            }],
            totalReceipt: [{
                $match: {
                    receptTime: {
                        $gt: moment().startOf('year').valueOf()
                    }
                }
            }, {
                $count: 'count'
            }],
        });

        res.json({
            status: 200,
            data: {
                todayReceipt: todayReceipt[0] ? todayReceipt[0].count : 0,
                weekyReceipt: weekyReceipt[0] ? weekyReceipt[0].count : 0,
                monthReceipt: monthReceipt[0] ? monthReceipt[0].count : 0,
                totalReceipt: totalReceipt[0] ? totalReceipt[0].count : 0
            }
        });
    } catch (error) {

    }
});

//获取客户经理待办
router.get('/sellerManageTodo', async (req, res) => {
    try {
        let toReviewStatusid = reviewStatusList.find(r => r.name === "等待审核").id;
        let [toReviewReceipt, toReviewContract] = await Promise.all([
            payreceiptModel.countDocuments({
                status: toReviewStatusid
            }),
            newcontractModel.countDocuments({
                status: toReviewStatusid
            })
        ]);
        res.isuccess({
            toReviewReceipt,
            toReviewContract
        });
    } catch (error) {
        res.ierror(error)
    }
});




//获取客户总数及已成交统计
router.get('/customData', async (req, res) => {
    try {
        let condition = {
            $and: [{
                    receptTime: {
                        $gte: Number(req.query.startTime)
                    }
                },
                {
                    receptTime: {
                        $lt: Number(req.query.endTime)
                    }
                }
            ]
        }
        let dealStatus = customStatusList.find(s => s.name === '已成交');
        let result = await customModel.aggregate([{
                $match: condition
            },
            {
                $group: {
                    _id: null,
                    totalNumber: {
                        $sum: 1
                    },
                    dealNumber: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ["$status", dealStatus.id]
                                },
                                then: 1,
                                else: 0
                            }
                        }
                    }
                }
            }
        ]);
        res.isuccess(result[0]);
    } catch (error) {
        res.ierror(error);
    }
});


//获取客户来源数据
router.get('/customfrom', async (req, res) => {
    try {
        let result = await customfromModel.aggregate([{
                $lookup: {
                    from: 'Customs',
                    localField: 'oid',
                    foreignField: 'from',
                    as: 'customList'
                }
            },

            {
                $addFields: {
                    customList1: {
                        $cond: {
                            if: {
                                $arrayElemAt: ["$customList", 0]
                            },
                            then: '$customList',
                            else: [{}]
                        }

                    }
                }
            },
            {
                $unwind: '$customList1'
            },
            {
                $group: {
                    _id: '$_id',
                    name: {
                        $first: '$name'
                    },
                    value: {
                        $sum: {
                            $cond: {
                                if: {
                                    $and: [{
                                            $gte: ['$customList1.receptTime', Number(req.query.startTime)]
                                        },
                                        {
                                            $lt: ['$customList1.receptTime', Number(req.query.endTime)]
                                        }
                                    ]
                                },
                                then: 1,
                                else: 0
                            }
                        }
                    }
                }
            }
        ]).sort('_id');
        res.isuccess(result || []);
    } catch (error) {
        res.ierror(error)
    }
});


const times = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
let timesum = {};
times.forEach(t => {
    timesum[t] = {
        $sum: {
            $cond: {
                if: {
                    $and: [{
                            $gte: ['$hour', t]
                        },
                        {
                            $lt: ['$hour', t + 1]
                        }
                    ]
                },
                then: 1,
                else: 0
            }
        }
    }
});

//获取客户录入时间分析
router.get('/customtime', async (req, res) => {
    try {
        let result = await customModel.aggregate([{
                $match: {
                    $and: [{
                            receptTime: {
                                $gte: Number(req.query.startTime)
                            }
                        },
                        {
                            receptTime: {
                                $lt: Number(req.query.endTime)
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    hour: {
                        $add: [{
                            $hour: {
                                $toDate: '$receptTime'
                            }
                        }, 8]
                    }
                },
            },
            {
                $group: {
                    _id: null,
                    ...timesum
                }
            }, {
                $project: {
                    _id: 0
                }
            }
        ]);
        res.isuccess(result || []);
    } catch (error) {
        res.ierror(error);
    }
});

//获取销售经理待办
router.get('/sellerManagerTodo', async (req, res) => {
    try {
        let conditions = {
            status: 1
        };
        let [toReviewPay, toReviewContract] = await Promise.all([
            payreceiptModel.countDocuments(conditions),
            newcontractModel.countDocuments(conditions)
        ]);
        res.isuccess({
            toReviewPay,
            toReviewContract
        });
    } catch (error) {
        res.ierror(error)
    }
});

//获取销售待办
router.get('/sellerTodo', async (req, res) => {
    try {
        let {
            sid: newSid
        } = await stautsModel.findOne({
            name: '新客户'
        });
        let newCustomStatusId = customStatusList.find(s => s.name === '新客户').id;
        let dealCustomStatusId = customStatusList.find(s => s.name === '已成交').id;
        let result = await customModel.aggregate([{
                $match: {
                    seller: Number(req.query.account)
                }
            },
            {
                $lookup: {
                    from: 'Followrecords',
                    localField: 'cid',
                    foreignField: 'cid',
                    as: 'followList'
                }
            },
            {
                $group: {
                    _id: null,
                    newCustom: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ['$status', newCustomStatusId]
                                },
                                then: 1,
                                else: 0
                            }
                        }
                    },
                    tofollow: {
                        $sum: {
                            $cond: {
                                if: {
                                    $arrayElemAt: ['$followList', 0]
                                },
                                then: 0,
                                else: 1
                            }
                        }
                    },
                    following: {
                        $sum: {
                            $cond: {
                                if: {
                                    $arrayElemAt: ['$followList', 0]
                                },
                                then: 1,
                                else: 0
                            }
                        }
                    },
                    haddeal: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ['$status', dealCustomStatusId]
                                },
                                then: 1,
                                else: 0
                            }
                        }
                    },

                }
            }
        ]);
        res.isuccess(result[0] || {});
    } catch (error) {
        res.ierror(error)
    }
});

//获取售后经理的待办数据
router.get('/aftersaleManagerTodo', async (req, res) => {
    try {
        let result = await neworderModel.countDocuments({
            executor: null
        });
        res.isuccess({
            toAllocOrder: result
        });
    } catch (error) {
        res.ierror(error)
    }
});

router.get('/aftersaleTodo', async (req, res) => {
    try {
        let result = await neworderModel.aggregate([{
                $match: {
                    executor: Number(req.query.account)
                }
            },
            {
                $lookup: {
                    from: 'Aftersales',
                    localField: 'oid',
                    foreignField: 'orderid',
                    as: 'aftersaleList'
                }
            }, {
                $addFields: {
                    aftersaleinfo: {
                        $ifNull: [{
                            $arrayElemAt: ['$aftersaleList', 0]
                        }, {}]
                    }
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
            {
                $group: {
                    _id: '$oid',
                    tofollow: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ['$followList.length', 0]
                                },
                                then: 1,
                                else: 0
                            }
                        }
                    },
                    following: {
                        $sum: {
                            $cond: {
                                if: {
                                    $gt: ['$followList.length', 0]
                                },
                                then: 1,
                                else: 0
                            }
                        }
                    },
                    done: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ['$aftersaleList.isEnd', 1] //全部完成的
                                },
                                then: 1,
                                else: 0
                            }
                        }
                    },
                }
            }

        ]);
        res.isuccess(result[0] || {});
    } catch (error) {
        res.ierror(error)
    }
});


//获取成交数据
router.get('/dealData', async (req, res) => {
    try {
        let condition = {
            createTime: {
                $gte: Number(req.query.startTime)
            },
            ...(req.query.account ? {
                creator: Number(req.query.account)
            } : {})
        }
        let result = await neworderModel.aggregate([{
                $match: condition
            },
            {
                $group: {
                    _id: '$cid',
                    dealorder: {
                        $sum: 1
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    dealCustom: {
                        $sum: 1
                    },
                    dealOrder: {
                        $sum: '$dealorder'
                    }
                }
            },
            {
                $project: {
                    _id: 0
                }
            }

        ]);
        res.isuccess(result[0] || {});
    } catch (error) {
        res.ierror(error)
    }
});


router.get('/achievementOverview', async (req, res) => {
    try {
        let condition = {
            $and: [{
                    createTime: {
                        $gte: Number(req.query.startTime)
                    }
                },
                {
                    createTime: {
                        $lt: Number(req.query.endTime)
                    }
                }
            ]
        }
        let result = await payreceiptModel.aggregate([{
                $match: condition
            },
            {
                $group: {
                    _id: null,
                    total: {
                        $sum: '$money'
                    },
                    noReview: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: ["$status", 0]
                                },
                                then: '$money',
                                else: 0
                            }
                        }
                    },
                    reviewPassed: {
                        $sum: {
                            $sum: {
                                $cond: {
                                    if: {
                                        $eq: ["$status", 1]
                                    },
                                    then: '$money',
                                    else: 0
                                }
                            }
                        }
                    },
                    reviewReject: {
                        $sum: {
                            $sum: {
                                $cond: {
                                    if: {
                                        $eq: ["$status", 2]
                                    },
                                    then: '$money',
                                    else: 0
                                }
                            }
                        }
                    },
                }
            }
        ]);
        res.isuccess(result[0] || {
            "_id": null,
            "total": 0,
            "noReview": 0,
            "reviewPassed": 0,
            "reviewReject": 0
        });

    } catch (error) {
        res.ierror(error);
    }
});

//获取业绩详情
router.get('/achievementEvery', async (req, res) => {
    try {

        let result = await userModel.aggregate([{
                $match: {
                    role: appRoleList.find(r => r.name === '销售员').id
                }
            },
            {
                $lookup: {
                    from: 'Payreceipts',
                    localField: 'account',
                    foreignField: 'creator',
                    as: 'payreceiptList'
                }
            },
            {
                $addFields: {
                    payreceiptList1: {
                        $cond: {
                            if: {
                                $arrayElemAt: ['$payreceiptList', 0]
                            },
                            then: '$payreceiptList',
                            else: [{}]
                        }
                    }
                }
            },
            {
                $unwind: '$payreceiptList1'
            },
            {
                $group: {
                    _id: '$account',
                    name: {
                        $first: '$name'
                    },
                    reviewPassed: {
                        $sum: {
                            $cond: {
                                if: {
                                    $and: [
                                        '$payreceiptList1.money',
                                        {
                                            $eq: ['$payreceiptList1.status', reviewStatusList.find(r => r.name === '审核通过').id]
                                        },
                                        {
                                            $gte: ['$payreceiptList1.createTime', Number(req.query.startTime)],

                                        },
                                        {
                                            $lt: ['$payreceiptList1.createTime', Number(req.query.endTime)],

                                        }
                                    ]
                                },
                                then: '$payreceiptList1.money',
                                else: 0
                            }
                        }
                    },
                    reviewReject: {
                        $sum: {
                            $cond: {
                                if: {
                                    $and: [
                                        '$payreceiptList1.money',
                                        {
                                            $eq: ['$payreceiptList1.status', reviewStatusList.find(r => r.name === '审核驳回').id]
                                        },
                                        {
                                            $gte: ['$payreceiptList1.createTime', Number(req.query.startTime)],

                                        },
                                        {
                                            $lt: ['$payreceiptList1.createTime', Number(req.query.endTime)],

                                        }
                                    ]
                                },
                                then: '$payreceiptList1.money',
                                else: 0
                            }
                        }
                    },
                    toReview: {
                        $sum: {
                            $cond: {
                                if: {
                                    $and: [
                                        '$payreceiptList1.money',
                                        {
                                            $eq: ['$payreceiptList1.status', reviewStatusList.find(r => r.name === '等待审核').id]
                                        },
                                        {
                                            $gte: ['$payreceiptList1.createTime', Number(req.query.startTime)],

                                        },
                                        {
                                            $lt: ['$payreceiptList1.createTime', Number(req.query.endTime)],

                                        }
                                    ]
                                },
                                then: '$payreceiptList1.money',
                                else: 0
                            }
                        }
                    }

                }
            }
        ]).sort('_id');
        res.isuccess(result || []);

    } catch (error) {
        res.ierror(error)
    }
});

//获取订单详情
router.get('/orderEvery', async (req, res) => {
    try {
        let result = await userModel.aggregate([{
                $match: {
                    role: appRoleList.find(r => r.name === '销售员').id
                }
            },
            {
                $lookup: {
                    from: 'Neworders',
                    localField: 'account',
                    foreignField: 'creator',
                    as: 'orderList'
                }
            }, {
                $addFields: {
                    orderList1: {
                        $cond: {
                            if: {
                                $arrayElemAt: ['$orderList', 0]
                            },
                            then: '$orderList',
                            else: [{}]
                        }
                    }
                }
            }, {
                $unwind: '$orderList1'
            }, {
                $group: {
                    _id: '$account',
                    name: {
                        $first: '$name'
                    },
                    value: {
                        $sum: {
                            $cond: {
                                if: {
                                    $and: [{
                                            $gte: ['$orderList1.createTime', Number(req.query.startTime)],
                                        },
                                        {
                                            $lt: ['$orderList1.createTime', Number(req.query.endTime)],
                                        }
                                    ]
                                },
                                then: 1,
                                else: 0
                            }
                        }
                    },
                }
            }
        ]).sort('_id');
        res.isuccess(result || []);
    } catch (error) {
        res.ierror(error)
    }
});

module.exports = router;