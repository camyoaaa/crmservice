var express = require("express");
var router = express.Router();

var customModel = require("../models/custom");
var userModel = require("../models/user");
var customStatusModel = require("../models/customstatus.js");

const {
    getDataStatisticsTime
} = require("../tool");

const {
    generateConditions
} = require("../tool");
//剥离记录中敏感信息


/* GET users listing. */
router.get("/", async function (req, res, next) {
    try {
        let customInfo = await customModel.findOne({
            cid: req.query.cid
        }).select({
            '_id': 0,
            "_v": 0
        });
        if (customInfo) {
            res.json({
                status: 200,
                msg: "查询成功",
                data: customInfo
            });
        }
    } catch (error) {

    }
});

router.post("/add", async function (req, res, next) {
    try {

        let createMs = Date.now(); //现在准备分配的时间
        //查找默认状态
        let {
            _doc: matchStatus
        } = await customStatusModel.findOne({
            isdefault: true
        });
        //新录入客户
        let addSuccess = await customModel.create({
            status: matchStatus.sid,
            receptTime: createMs,
            ...req.body
        });
        // console.log('global.SocketIO.salesManager', global.SocketIO.salesManager);
        global.SocketIO.salesManager.emit('test', 'salesManager xxxxxxxxx', function (data) {
            console.log('global.SocketIO.salesManager test data', data);
        });

        // let findUser = await userModel.findOne({
        //     account: req.body.seller
        // });
        // let reset = createMs >= DataStatisticsTime && findUser.lastTaskTime < DataStatisticsTime; //如果本次分配时间是今天,且上次分配时间是昨天,那么重置该员工的分配数量

        // let updatePipes = reset ? {
        //     $set: {
        //         lastTaskTime: createMs,
        //         todayRecepted: 1
        //     }
        // } : {
        //     $set: {
        //         lastTaskTime: createMs
        //     },
        //     $inc: {
        //         todayRecepted: 1
        //     }
        // };
        // let updateUser = await userModel.updateOne({
        //     account: req.body.seller
        // }, updatePipes);
        if (addSuccess) {
            res.json({
                status: 200,
                msg: "新增成功"
            });
        }
    } catch (error) {
        console.log('error', error);
    }
});


router.post('/sellerAlloc', async function (req, res, next) {
    let DataStatisticsTime = getDataStatisticsTime(); //任务统计时间
    let createMs = Date.now(); //现在准备分配的时间
    let findSeller = await userModel.findOne({
        account: Number(req.body.seller)
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

    let success = await Promise.all([
        userModel.updateOne({
            account: Number(req.body.seller)
        }, updatePipes),
        customModel.updateOne({
            cid: Number(req.body.cid)
        }, {
            seller: Number(req.body.seller),
            sellerAllocTime: createMs,
            sellerManager: req.body.sellerManager
        })
    ]);
    if (success) {

        function socketiotoSeller() {}
        res.json({
            status: 200,
            msg: '分配成功'
        });
    }
});

//查询接待客户,提供给:接待人员
router.get('/receptList', async function (req, res, next) {
    let {
        pageNo,
        pageSize,
        contact, //联系方式
        userid,
        fuzzies, //模糊查询字段数组
        ...filters
    } = req.query;

    //过滤后的查询条件
    let filteredConditions = generateConditions(filters, fuzzies, {
        toNumber: ['seller', 'aftersale', 'receptionist', 'status', 'cid']
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
    try {
        const [totalCount, list] = await Promise.all([
            customModel.countDocuments(filteredConditions),
            customModel.aggregate([{
                    $match: filteredConditions
                },
                { //关联状态
                    $lookup: {
                        from: 'CustomStatus',
                        localField: 'status',
                        foreignField: 'sid',
                        as: 'status_doc'
                    },
                },
                {
                    $unwind: '$status_doc'
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
                { //关联接待人员
                    $lookup: {
                        from: 'Users',
                        localField: 'receptionist',
                        foreignField: 'account',
                        as: 'receptionist_doc'
                    },
                },
                {
                    $unwind: '$receptionist_doc'
                }
            ]).sort({
                'status_doc.order': 1, //根据状态排序
                _id: -1
            }).skip((Number(pageNo) - 1) * Number(pageSize))
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

//获取已经分配或未分配的客户列表 ,提供给:售前经理
router.get('/sellerAllocList', async function (req, res, next) {
    let {
        pageNo,
        pageSize,
        contact, //联系方式
        userid,
        fuzzies, //模糊查询字段数组
        ...filters
    } = req.query;

    //过滤后的查询条件
    let filteredConditions = generateConditions(filters, fuzzies, {
        toNumber: ['seller', 'receptionist', 'status', 'cid']
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
    try {
        const [totalCount, list] = await Promise.all([
            customModel.countDocuments(filteredConditions),
            customModel.aggregate([{
                    $match: filteredConditions
                },
                { //关联状态
                    $lookup: {
                        from: 'CustomStatus',
                        localField: 'status',
                        foreignField: 'sid',
                        as: 'status_doc'
                    },
                },
                {
                    $unwind: '$status_doc'
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
                { //关联接待人员
                    $lookup: {
                        from: 'Users',
                        localField: 'receptionist',
                        foreignField: 'account',
                        as: 'receptionist_doc'
                    },
                },
                {
                    $unwind: '$receptionist_doc'
                },
                { //关联售前人员
                    $lookup: {
                        from: 'Users',
                        localField: 'seller',
                        foreignField: 'account',
                        as: 'seller_doc'
                    },
                }
            ]).sort({
                'status_doc.order': 1, //根据状态排序
                _id: -1
            }).skip((Number(pageNo) - 1) * Number(pageSize))
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


router.get('/sellerCustomList', async function (req, res, next) {
    let {
        pageNo,
        pageSize,
        contact, //联系方式
        userid,
        fuzzies, //模糊查询字段数组
        ...filters
    } = req.query;

    //过滤后的查询条件
    let filteredConditions = generateConditions(filters, fuzzies, {
        toNumber: ['seller', 'receptionist', 'status', 'cid']
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
    console.log('filteredConditions', filteredConditions);
    try {
        const [totalCount, list] = await Promise.all([
            customModel.countDocuments(filteredConditions),
            customModel.aggregate([{
                    $match: filteredConditions
                },
                { //关联状态
                    $lookup: {
                        from: 'CustomStatus',
                        localField: 'status',
                        foreignField: 'sid',
                        as: 'status_doc'
                    },
                },
                {
                    $unwind: '$status_doc'
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
                { //关联接待人员
                    $lookup: {
                        from: 'Users',
                        localField: 'sellerManager',
                        foreignField: 'account',
                        as: 'sellerManager_doc'
                    },
                },
                {
                    $unwind: '$sellerManager_doc'
                },
                { //关联售前人员
                    $lookup: {
                        from: 'Users',
                        localField: 'seller',
                        foreignField: 'account',
                        as: 'seller_doc'
                    },
                },
                {
                    $unwind: '$seller_doc'
                },
                { //关联跟进记录
                    $lookup: {
                        from: 'Followrecords',
                        localField: 'cid',
                        foreignField: 'cid',
                        as: 'followList'
                    },
                }
            ]).sort({
                'status_doc.order': 1, //根据状态排序
                _id: -1
            }).skip((Number(pageNo) - 1) * Number(pageSize))
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
            toNumber: ['seller', 'aftersale', 'status', 'cid']
        });
        const [totalCount, list] = await Promise.all([
            customModel.countDocuments(filteredConditions),
            customModel.aggregate([{
                    $match: filteredConditions
                },
                { //关联状态
                    $lookup: {
                        from: 'CustomStatus',
                        localField: 'status',
                        foreignField: 'sid',
                        as: 'status_doc'
                    },
                },
                {
                    $unwind: '$status_doc'
                },
                { //关联销售人员
                    $lookup: {
                        from: 'Users',
                        localField: 'seller',
                        foreignField: 'account',
                        as: 'seller_doc'
                    },
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
                { //关联跟进记录
                    $lookup: {
                        from: 'Followrecords',
                        localField: 'cid',
                        foreignField: 'cid',
                        as: 'followList'
                    },
                }
            ]).sort({
                'status_doc.order': 1, //根据状态排序
                _id: -1
            }).skip((Number(pageNo) - 1) * Number(pageSize))
            .limit(Number(pageSize))
        ]);
        console.log(totalCount, list);
        if (true) {
            //totalCount && Array.isArray(list) && list.length > 0
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


router.get('/orderedlist', async function (req, res, next) {

    let {
        pageNo,
        pageSize,
        userid,
        fuzzies, //模糊查询字段数组
        ...filters
    } = req.query;
    try {
        let filteredConditions = generateConditions(filters, fuzzies);

        if (filteredConditions.aftersale) {
            filteredConditions.aftersale = Number(filteredConditions.aftersale);
        }
        if (filteredConditions.cid) {
            filteredConditions.cid = Number(filteredConditions.cid);
        }
        let dealSatus = await customStatusModel.findOne({
            name: '已成交'
        });
        filteredConditions.status == dealSatus.sid;
        const [totalCount, list] = await Promise.all([
            customModel.countDocuments(filteredConditions),
            customModel.aggregate([{
                    $match: filteredConditions
                }, {
                    $lookup: {
                        from: 'Contracts',
                        localField: 'cid',
                        foreignField: 'cid',
                        as: 'contractList'
                    },

                },
                {
                    $lookup: {
                        from: 'Meals',
                        localField: 'contractList.mid',
                        foreignField: 'mid',
                        as: 'contractList.mealInfo'
                    },
                },
                {
                    $unwind: '$contractList.mealInfo'
                },
                {
                    $group: {
                        _id: '$cid',
                        cid: {
                            $first: "$cid"
                        },
                        name: {
                            $first: "$name"
                        },
                        orderList: {
                            $push: '$orderList'
                        },
                        city: {
                            $first: "$city"
                        },
                        county: {
                            $first: "$county"
                        },
                        dealTime: {
                            $first: "$dealTime"
                        },
                        allocTime: {
                            $first: "$allocTime"
                        },
                        followList: {
                            $first: "$followList"
                        },
                        from: {
                            $first: "$from"
                        },
                        fromZn: {
                            $first: "$fromZn"
                        },
                        keywords: {
                            $first: "$keywords"
                        },
                        name: {
                            $first: "$name"
                        },
                        phone: {
                            $first: "$phone"
                        },
                        province: {
                            $first: "$province"
                        },
                        qq: {
                            $first: "$qq"
                        },
                        wx: {
                            $first: "$wx"
                        },
                        receptionist: {
                            $first: "$receptionist"
                        },
                        receptionistName: {
                            $first: "$receptionistName"
                        },
                        receptionistremark: {
                            $first: "$receptionistremark"
                        },
                        seller: {
                            $first: "$seller"
                        },
                        sellerName: {
                            $first: "$sellerName"
                        },
                        aftersale: {
                            $first: "$aftersale"
                        },
                        aftersaleName: {
                            $first: "$aftersaleName"
                        },
                        status: {
                            $first: "$status"
                        },
                        statusColor: {
                            $first: "$statusColor"
                        },
                        statusZn: {
                            $first: "$statusZn"
                        },
                        updateTime: {
                            $first: "$updateTime"
                        }
                    }
                }
            ]).sort({
                'status_doc.order': 1,
                _id: -1
            }).skip((Number(pageNo) - 1) * Number(pageSize))
            .limit(Number(pageSize))
        ]);
        console.log(totalCount, list);
        if (true) {
            //totalCount && Array.isArray(list) && list.length > 0
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


router.get('/aftersalelist', async function (req, res, next) {

    let {
        pageNo,
        pageSize,
        userid,
        fuzzies, //模糊查询字段数组
        ...filters
    } = req.query;
    try {
        let filteredConditions = generateConditions(filters, fuzzies);

        if (filteredConditions.aftersale) {
            filteredConditions.aftersale = Number(filteredConditions.aftersale);
        }
        if (filteredConditions.cid) {
            filteredConditions.cid = Number(filteredConditions.cid);
        }
        filteredConditions.statusZn = '已成交';
        console.log('filteredConditions', filteredConditions);
        const [totalCount, list] = await Promise.all([
            customModel.countDocuments(filteredConditions),
            customModel.aggregate([{
                    $lookup: {
                        from: 'Aftersales',
                        localField: 'cid',
                        foreignField: 'cid',
                        as: 'aftersales'
                    },

                },
                {
                    $match: filteredConditions
                },

            ]).sort({
                'aftersales.createTime': 1,
                _id: -1
            }).skip((Number(pageNo) - 1) * Number(pageSize))
            .limit(Number(pageSize))
        ]);
        console.log(totalCount, list);
        if (true) {
            //totalCount && Array.isArray(list) && list.length > 0
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
        cid,
        ...payload
    } = req.body;
    try {
        let updateSuccess = await customModel.updateOne({
            cid
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
        console.log('req.body.cids', req.body.cids);
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