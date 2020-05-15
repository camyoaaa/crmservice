var express = require("express");
var router = express.Router();
var moment = require('moment');

var contractModel = require("../models/contract");
var newcontractModel = require("../models/newcontract");
var userModel = require("../models/user");
// 引入解析包
const formidable = require("formidable");
const fs = require("fs");
const path = require("path");
const address = require("address");

const {
    recordStatus,
    reviewStatusList,
    appRoleList
} = require('../config');

const {
    APP_HOST,
    APP_PORT
} = require('../systemConfig');
const {
    generateConditions,
    getFileType
} = require("../tool");

/* GET users listing. */
router.get("/", function (req, res, next) {
    res.send("respond with a resource");
});


//新增合同
router.post("/add", async function (req, res, next) {
    try {
        let contractWaitStatus = reviewStatusList.find(r => r.name === '等待审核').id;

        let form = new formidable.IncomingForm();

        form.encoding = "utf-8"; // 编码
        form.keepExtensions = true; // 保留扩展名

        form.uploadDir = path.join(__dirname, "../public/images/contractshot/"); //文件存储路径 最后要注意加 '/' 否则会被存在public下

        form.parse(req, async (err, fields, files) => {
            fields.orderid = Number(fields.orderid);
            fields.cid = Number(fields.cid);
            if (err) {
                return next(err);
            }

            let contract = await newcontractModel.create({
                ...fields,
                status: contractWaitStatus,
                createTime: Date.now()
            });

            if (contract) {
                let oldPath = files.file.path;
                let imgName = `${contract.ctid}_${moment().format('YYYYMMDDHHmmss')}.${getFileType(oldPath)}` //合同编号_20200430102511.png
                let newPath = path.join(__dirname, `../public/images/contractshot/${imgName}`);
                let finalpath = `http://${APP_HOST}:${APP_PORT}/images/contractshot/${imgName}`;

                fs.rename(oldPath, newPath, async () => {
                    await newcontractModel.updateOne({
                        ctid: contract.ctid
                    }, {
                        $set: {
                            shot: finalpath
                        }
                    });

                    let sender = await userModel.findOne({
                        account: req.userid
                    });
                    let messageBody = {
                        from: req.userid,
                        to: appRoleList.find(r => r.name === '销售经理').id,
                        message: `【新合同/${contract.ctid}】,请尽快审核`,
                        time: Date.now()
                    }
                    let socketBody = {
                        type: 'newContract',
                        id: contract.ctid,

                        message: sender.name,
                        description: messageBody.message,
                        icon: sender.avatar,

                        messageBody
                    }
                    res.userSocket().sendMessage({
                        to: 'sellerManager',
                        messageBody,
                        socketBody
                    });

                    res.isuccess();
                });
            }
        });
    } catch (error) {
        console.log(error);
        res.ierror('添加合同出错,请重新添加')
    }
});


//获取合同列表
router.get("/list", async function (req, res, next) {
    let {
        pageNo,
        pageSize,
        startTime,
        endTime,
        fuzzies, //模糊查询字段数组
        ...filters
    } = req.query;
    try {
        let filteredConditions = generateConditions(filters, fuzzies, {
            toNumber: ['ctid', 'cid', 'orderid', 'status', 'creator', 'reviewer']
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
            newcontractModel.countDocuments(filteredConditions),
            newcontractModel.aggregate([{
                    $match: filteredConditions,
                },
                { //关联订单信息
                    $lookup: {
                        from: 'Neworders',
                        localField: 'orderid',
                        foreignField: 'oid',
                        as: 'orderList'
                    }
                },
                {
                    $addFields: {
                        orderInfo: {
                            $ifNull: [{
                                $arrayElemAt: ["$orderList", 0]
                            }, {}]
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'Meals',
                        localField: 'orderInfo.mid',
                        foreignField: 'mid',
                        as: 'orderInfo.mealList'
                    }
                },
                {
                    $addFields: {
                        'orderInfo.mealinfo': {
                            $ifNull: [{
                                $arrayElemAt: ['$orderInfo.mealList', 0]
                            }, {}]
                        }
                    }
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
                { //关联创建人名称
                    $lookup: {
                        from: 'Users',
                        localField: 'creator',
                        foreignField: 'account',
                        as: 'creatorList'
                    }
                },
                {
                    $addFields: {
                        creatorInfo: {
                            $ifNull: [{
                                $arrayElemAt: ['$creatorList', 0]
                            }, {}]
                        }
                    },
                },
                {
                    $addFields: {
                        creatorName: {
                            $ifNull: ['$creatorInfo.name', '']
                        }
                    },
                },
                { //关联审核人
                    $lookup: {
                        from: 'Users',
                        localField: 'reviewer',
                        foreignField: 'account',
                        as: 'reviewerList'
                    }
                },
                {
                    $addFields: {
                        reviewerInfo: {
                            $ifNull: [{
                                $arrayElemAt: ['$reviewerList', 0]
                            }, {}]
                        }
                    }
                },
                {
                    $addFields: {
                        reviewerName: {
                            $ifNull: ['$reviewerInfo.name', '']
                        }
                    }
                },
                {
                    $project: {
                        creatorList: 0,
                        creatorInfo: 0,
                        reviewerList: 0,
                        reviewerInfo: 0,
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


//上传合同截图
router.post('/shot', async function (req, res, next) {
    try {
        let form = new formidable.IncomingForm();

        form.encoding = "utf-8"; // 编码
        form.keepExtensions = true; // 保留扩展名
        form.maxFieldsSize = 2 * 1024 * 1024; //文件大小
        form.uploadDir = path.join(__dirname, "../public/images/contractshot/"); //文件存储路径 最后要注意加 '/' 否则会被存在public下

        form.parse(req, async (err, fields, files) => {
            if (err) {
                return next(err);
            }
            let imgPath = files.file.path;

            let oldPath = files.file.path;
            let imgName = `${fields.ctid}_${moment().format('YYYYMMDDHHmmss')}.${getFileType(oldPath)}`
            let newPath = path.join(__dirname, `../public/images/contractshot/${imgName}`)
            let finalpath = `http://${APP_HOST}:${APP_PORT}/images/contractshot/${imgName}`;

            fs.rename(oldPath, newPath, async () => {
                let {
                    shot: preShot
                } = await newcontractModel.findOneAndUpdate({
                    ctid: Number(fields.ctid)
                }, {
                    $set: {
                        shot: finalpath
                    }
                }, {
                    new: false //返回更新前的记录
                });
                if (preShot) { //删除原截图文件
                    let paths = preShot.split('/');
                    let pngname = paths[paths.length - 1];
                    if (pngname) {
                        fs.unlink(path.join(__dirname, `../public/images/payshot/${pngname}`), function () {
                            console.log(`删除文件${pngname}成功`);
                        });
                    }
                }
                res.isuccess();
            });

        });
    } catch (err) {
        res.ierror(err.toString())
    }
});

//更新合同(可批量)
router.put("/update", async function (req, res, next) {
    const {
        ctids,
        ...payload
    } = req.body;
    try {
        let updateSuccess = await newcontractModel.updateMany({
            ctid: {
                $in: ctids
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
    }
});


router.put('/review', async (req, res) => {
    let reviewPassedId = reviewStatusList.find(r => r.name === "审核通过").id;

    try {
        let {
            ctid,
            status,
            reviewer,
            reviewmark
        } = req.body;
        let passed = reviewPassedId == status;
        let result = await newcontractModel.findOneAndUpdate({
            ctid
        }, {
            $set: {
                status,
                reviewer,
                reviewmark
            }
        });

        let messageBody = {
            from: reviewer,
            to: result.creator,
            message: `【合同/${ctid}】审核${passed?'通过':'驳回'}`
        }

        let sender = await userModel.findOne({
            account: reviewer
        });

        let socketBody = {
            type: 'receiptReview',

            id: ctid,

            message: sender.name,
            description: messageBody.message,
            icon: sender.avatar,

            messageBody
        }

        res.userSocket(result.creator).sendMessage({
            messageBody,
            socketBody
        });
        res.isuccess()
    } catch (error) {
        console.log(error);
        res.ierror(error)
    }
});

//删除合同
router.delete("/delete", async function (req, res, next) {
    try {
        let result = await contractModel.updateOne({
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