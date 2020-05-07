var express = require("express");
var router = express.Router();

var customModel = require("../models/custom");
var userModel = require("../models/user");
var customStatusModel = require("../models/customstatus.js");
var messageModel = require('../models/message');
const {
    getDataStatisticsTime
} = require("../tool");

const {
    customStatusList
} = require('../config');

const {
    generateConditions
} = require("../tool");
//剥离记录中敏感信息


/* GET users listing. */
router.get("/", async function (req, res, next) {});

//新增客户
router.post("/add", async function (req, res, next) {
    try {
        let createMs = Date.now(); //现在准备分配的时间
        let DataStatisticsTime = getDataStatisticsTime(); //任务统计时间
        let newStatus = customStatusList.find(s => s.name === '新客户').id; //新客户状态id

        let seller = Number(req.body.seller);
        let receptionist = Number(req.body.receptionist);

        let findSeller = await userModel.findOne({
            account: seller
        });
        let reset = createMs >= DataStatisticsTime && findSeller.lastTaskTime < DataStatisticsTime; //如果本次分配时间是今天,且上次分配时间是昨天,那么重置该员工的分配数量

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

        let allocPromise = userModel.updateOne({
            account: seller
        }, updatePipes)

        let addPromise = customModel.create({
            status: newStatus,
            receptTime: createMs,
            seller,
            receptionist,
            ...req.body
        });
        let [allocResult, addResult] = await Promise.all([allocPromise, addPromise]);

        let sender = await userModel.findOne({
            account: receptionist
        });

        let messageBody = {
            from: receptionist,
            to: seller,
            message: `【${addResult.name}/${addResult.cid}】 已经分配给你啦,快去协助他(她)吧`,
            time: Date.now()
        }
        let socketBody = {
            type: 'allocCustom',
            id: addResult.cid,

            message: sender.name,
            description: messageBody.message,
            icon: sender.avatar,

            messageBody
        }
        res.userSocket(seller).sendMessage({
            messageBody,
            socketBody
        });

        if (allocResult && addResult) {
            res.json({
                status: 200,
                msg: "新增成功"
            });
        }
    } catch (error) {
        console.log('error', error);
    }
});

//查询客户
router.get('/list', async function (req, res, next) {
    let {
        pageNo = 1,
            pageSize = 10,
            contact, //联系方式
            startTime,
            endTime,
            fuzzies, //模糊查询字段数组
            ...filters
    } = req.query;

    //过滤后的查询条件
    let filteredConditions = generateConditions(filters, fuzzies, {
        toNumber: ['cid', 'receptionist', 'sellerManager', 'lastSeller', 'seller', 'status']
    });

    if (contact) { //如果传入联系方式
        let NumberedContact = Number(contact)
        if (isNaN(NumberedContact)) { //只有微信号不能转化为数字
            filteredConditions.wx = new RegExp(contact)
        } else {
            filteredConditions.$or = [{
                    qq: new RegExp(NumberedContact)
                },
                {
                    wx: new RegExp(NumberedContact)
                },
                {
                    phone: new RegExp(NumberedContact)
                },
            ]
        }
    }

    if (startTime && endTime) { //传入了时间
        filteredConditions.$and = [{
                'receptTime': {
                    $gt: Number(startTime)
                }
            }, {
                'receptTime': {
                    $lt: Number(endTime)
                }
            }

        ]
    }

    console.log('filteredConditions', filteredConditions);

    const groupFields = ['cid', 'name', 'from', 'phone', 'wx', 'qq', 'idcard', 'address', 'province', 'city', 'county', 'status', 'receptionist', 'sellerManager', 'seller', 'lastSeller', 'remark', 'receptTime', 'updateTime', 'fromZn', 'receptionistName', 'lastSellerName', 'sellerName', 'followList']
    let groupActions = {};
    groupFields.forEach(element => {
        groupActions[element] = {
            $first: `$${element}`
        }
    });
    try {
        const [totalCount, list] = await Promise.all([
            customModel.countDocuments(filteredConditions),
            customModel.aggregate([{
                    $match: filteredConditions
                },
                { //关联客户来源
                    $lookup: {
                        from: 'Customfroms',
                        localField: 'from',
                        foreignField: 'oid',
                        as: 'from_doc'
                    },
                },
                {
                    $unwind: '$from_doc'
                },
                {
                    $addFields: {
                        fromZn: '$from_doc.name'
                    }
                },
                { //关联接待人员
                    $lookup: {
                        from: 'Users',
                        localField: 'receptionist',
                        foreignField: 'account',
                        as: 'receptionistInfo'
                    },
                },
                {
                    $unwind: '$receptionistInfo'
                },
                {
                    $addFields: {
                        receptionistName: '$receptionistInfo.name'
                    }
                },
                { //关联上一销售人员(销售)
                    $lookup: {
                        from: 'Users',
                        localField: 'lastSeller',
                        foreignField: 'account',
                        as: 'lastSellerList'
                    },
                },
                {
                    $addFields: {
                        lastSellerInfo: {
                            $ifNull: [{
                                $arrayElemAt: ["$lastSellerList", 0]
                            }, {}]
                        }
                    }
                },
                {
                    $addFields: {
                        lastSellerName: {
                            $ifNull: ['$lastSellerInfo.name', '']
                        }
                    }
                },
                { //关联销售人员(销售)
                    $lookup: {
                        from: 'Users',
                        localField: 'seller',
                        foreignField: 'account',
                        as: 'sellerList'
                    },
                },
                {
                    $addFields: {
                        sellerInfo: {
                            $ifNull: [{
                                $arrayElemAt: ["$sellerList", 0]
                            }, {}]
                        }
                    }
                },
                {
                    $addFields: {
                        sellerName: {
                            $ifNull: ['$sellerInfo.name', '']
                        }
                    }
                },
                { //关联跟进记录
                    $lookup: {
                        from: 'Followrecords',
                        localField: 'cid',
                        foreignField: 'cid',
                        as: 'followList'
                    },
                },
                { //关联签单记录
                    $lookup: {
                        from: 'Neworders',
                        localField: 'cid',
                        foreignField: 'cid',
                        as: 'orderList'
                    },
                },
                {
                    $addFields: {
                        orderList1: {
                            $cond: {
                                if: {
                                    $arrayElemAt: ['$orderList', 0]
                                },
                                then: '$orderList',
                                else: [null]
                            }
                        }
                    }
                },
                {
                    $unwind: '$orderList1'
                },
                {
                    $addFields: {
                        order: '$orderList1'
                    }
                },
                {
                    $lookup: {
                        from: 'Meals',
                        localField: 'order.mid',
                        foreignField: 'mid',
                        as: 'order.mealList'
                    }
                },
                {
                    $addFields: {
                        'order.meal': {
                            $ifNull: [{
                                $arrayElemAt: ['$order.mealList', 0]
                            }, {}]
                        }
                    }
                },
                {
                    $project: {
                        receptionistInfo: 0,
                        lastSellerList: 0,
                        lastSellerInfo: 0,
                        sellerInfo: 0,
                        from_doc: 0,
                        __v: 0,
                        _id: 0
                    }
                },
                {
                    $group: {
                        _id: '$cid',
                        orderList: {
                            $push: {
                                $cond: {
                                    if: '$order',
                                    then: '$order',
                                    else: null

                                }
                            }
                        },
                        ...groupActions
                    }
                }, {
                    $addFields: {
                        filterOrderList: {
                            $filter: {
                                input: '$orderList',
                                as: 'aorder',
                                cond: {
                                    $toBool: '$$aorder.oid'
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        orderList: 0,
                        _id: 0
                    }
                }
            ]).sort("-receptTime").skip((Number(pageNo) - 1) * Number(pageSize))
            .limit(Number(pageSize))
        ]);
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
    } catch (error) {
        console.log("*********************************", error);
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


//更新客户(可批量)
router.put("/update", async function (req, res, next) {
    const {
        cids,
        ...payload
    } = req.body;
    try {
        let updateSuccess = await customModel.updateMany({
            cid: {
                $in: cids
            }
        }, {
            $set: {
                ...payload,
                updateTime: Date.now()
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

//删除客户(可批量)
router.delete("/delete", async function (req, res, next) {
    try {
        let result = await customModel.deleteMany({
            cid: {
                $in: req.body.cids
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