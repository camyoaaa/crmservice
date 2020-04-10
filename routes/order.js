var express = require("express");
var router = express.Router();
const address = require("address");

var orderModel = require("../models/order");
var neworderModel = require("../models/neworder");
var receiptModel = require("../models/payreceipt");
var newcontractModel = require("../models/newcontract");
var stautsModel = require('../models/customstatus');
var customModel = require('../models/custom');
var afterSalesModel = require('../models/aftersale');


// 引入解析包
var formidable = require("formidable");
var fs = require("fs");
let path = require("path");
var userModel = require("../models/user");

const {
    recordStatus
} = require('../config');
const {
    generateConditions
} = require("../tool");

/* GET users listing. */
router.get("/", async function (req, res, next) {
    res.send("respond with a resource");


});

router.get("/detail", async function (req, res, next) {
    try {
        let orderDetail = await neworderModel.aggregate([{
                $match: {
                    oid: Number(req.query.oid)
                }
            },
            {
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
                    from: 'Aftersales',
                    localField: 'oid',
                    foreignField: 'orderid',
                    as: 'aftersales'
                }
            },
            {
                $unwind: '$aftersales'
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
                    from: 'Newcontracts',
                    localField: 'oid',
                    foreignField: 'orderid',
                    as: 'contractList'
                }
            },
            {
                $lookup: {
                    from: 'Followrecords',
                    localField: 'oid',
                    foreignField: 'oid',
                    as: 'followrecords'
                }
            }
        ])
        res.json({
            status: 200,
            msg: '查新成功',
            data: orderDetail[0]
        });
    } catch (error) {

    }


});


router.post("/add", async function (req, res, next) {
    try {
        // let addSuccess = await orderModel.create(req.body);
        let addSuccess = await neworderModel.create(req.body);
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
            ...filters
        }, fuzzies, {
            toNumber: ['cid']
        });
        const [totalCount, list] = await Promise.all([
            neworderModel.countDocuments(filteredConditions),

            neworderModel.aggregate([{
                    $match: filteredConditions,
                }, {
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
                        from: 'Payreceipts',
                        localField: 'oid',
                        foreignField: 'orderid',
                        as: 'payList'
                    }
                },
                {
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
                    $lookup: {
                        from: 'Newcontracts',
                        localField: 'oid',
                        foreignField: 'orderid',
                        as: 'contractList'
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


//获取支付审核通过的订单
router.get('/paidPassedOrderList', async function (req, res, next) {
    let {
        pageNo,
        pageSize,
        userid,
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


router.post('/addReceipt', async function (req, res, next) {
    try {
        let receipt = await receiptModel.create({
            ...req.body,
            status: 1,
            createTime: Date.now()
        })
        let dealStatus = await stautsModel.findOne({
            name: '已成交'
        });
        console.log('dealStatus  req.body.cid', dealStatus, req.body.customid);
        let updateCustomStatus = await customModel.updateOne({
            cid: req.body.customid
        }, {
            $set: {
                status: dealStatus.sid
            }
        });
        if (updateCustomStatus) {
            res.json({
                status: 200,
                msg: '新增成功',
                receiptID: receipt.payreceiptid
            });
        }
    } catch (error) {
        console.log('/addReceipt', error);
    }
});

router.post('/payshot', async function (req, res, next) {
    let form = new formidable.IncomingForm();
    // form.encoding = "utf-8"; // 编码
    // 保留扩展名
    // form.keepExtensions = true;
    //文件存储路径 最后要注意加 '/' 否则会被存在public下
    form.uploadDir = path.join(__dirname, "../public/images/payshot/");
    let updateSucess = false;
    form.parse(req, (err, fields, files) => {
        if (err) {
            return next(err);
        }
        let imgPath = files.file.path;
        let imgName = files.file.name;
        // 返回路径和文件名
        try {
            fs.rename(imgPath, `${imgPath}.png`, async function () {
                let paths = imgPath.split("\\");
                let publicpath = paths[paths.length - 1];

                let finalpath = `http://${address.ip()}:3000/images/payshot/${publicpath}.png`;
                let result = await receiptModel.updateOne({
                    payreceiptid: Number(fields.receiptid)
                }, {
                    $set: {
                        shot: finalpath
                    }
                });
                updateSucess = result.nModified == 1;
                res.json({
                    status: updateSucess ? 200 : 500,
                    data: updateSucess ? {
                        name: imgName,
                        path: finalpath
                    } : {}
                });
            });
        } catch (err) {}
    });
});

router.post('/addContract', async function (req, res, next) {
    try {
        let contract = await newcontractModel.create({
            ...req.body,
            status: 1,
            createTime: Date.now()
        })
        res.json({
            status: 200,
            msg: '新增成功',
            ctid: contract.ctid
        });
    } catch (error) {
        console.log('/addContract', error);
    }
});

router.post('/contractshot', async function (req, res, next) {
    let form = new formidable.IncomingForm();
    form.encoding = "utf-8"; // 编码
    // 保留扩展名
    // form.keepExtensions = true;
    //文件存储路径 最后要注意加 '/' 否则会被存在public下
    form.uploadDir = path.join(__dirname, "../public/images/contractshot/");
    let updateSucess = false;
    form.parse(req, (err, fields, files) => {
        if (err) {
            return next(err);
        }
        let imgPath = files.file.path;
        let imgName = files.file.name;
        // 返回路径和文件名
        try {
            fs.rename(imgPath, `${imgPath}.png`, async function () {
                let paths = imgPath.split("\\");
                let publicpath = paths[paths.length - 1];

                let finalpath = `http://${address.ip()}:3000/images/contractshot/${publicpath}.png`;
                let result = await newcontractModel.updateOne({
                    ctid: Number(fields.ctid)
                }, {
                    $set: {
                        shot: finalpath
                    }
                });
                updateSucess = result.nModified == 1;
                res.json({
                    status: updateSucess ? 200 : 500,
                    data: updateSucess ? {
                        name: imgName,
                        path: finalpath
                    } : {}
                });
            });
        } catch (err) {}
    });
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

//分配订单
router.put("/afterAlloc", async function (req, res, next) {
    let {
        oid,
        cid,
        remark,
        ...payload
    } = req.body;
    try {
        let updateOrderRecord = await neworderModel.updateOne({
            oid
        }, {
            $set: {
                ...payload,
                allocTime: Date.now()
            }
        });
        let hasAfterSalesRecord = await afterSalesModel.findOne({
            orderid: oid
        });
        console.log('hasAfterSalesRecord', hasAfterSalesRecord, payload.distributor, payload.executor, remark);
        if (!hasAfterSalesRecord) {
            console.log('orderid', oid);
            let createAfterSaleRecord = await afterSalesModel.create({
                orderid: oid,
                cid,
                distributor: payload.distributor,
                executor: payload.executor,
                remark,
                createTime: Date.now()
            });

        }
        if (updateOrderRecord) {
            res.json({
                status: 200,
                msg: "分配成功"
            });
        }
    } catch (error) {
        console.log('createAfterSaleRecord error', error);

        res.json({
            status: 400,
            msg: error.message
        });
    }
});



module.exports = router;