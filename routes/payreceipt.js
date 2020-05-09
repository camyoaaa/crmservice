var express = require("express");
var router = express.Router();
var moment = require("moment");
// 引入解析包
const formidable = require("formidable");
const fs = require("fs");
const path = require("path");
const address = require("address");

var payreceiptModel = require("../models/payreceipt");
var customModel = require("../models/custom");
var userModel = require("../models/user");
var messageModel = require("../models/message");
const {
    generateConditions,
    getFileType
} = require("../tool");

const {
    reviewStatusList,
    customStatusList,
    appRoleList
} = require("../config");

const {
    APP_HOST,
    APP_PORT
} = require("../systemConfig");

/* GET users listing. */
router.get("/", function (req, res, next) {
    res.send("respond with a resource");
});

//新增收款
router.post("/add", async function (req, res) {
    try {
        let cutomDealStatus = customStatusList.find((s) => s.name === "已成交").id;
        let receiptWaitStatus = reviewStatusList.find((r) => r.name === "等待审核").id;
        let form = new formidable.IncomingForm();

        form.encoding = "utf-8"; // 编码
        form.keepExtensions = true; // 保留扩展名
        form.uploadDir = path.join(__dirname, "../public/images/payshot/"); //文件存储路径 最后要注意加 '/' 否则会被存在public下

        form.parse(req, async (err, fields, files) => {
            fields.orderid = Number(fields.orderid);
            fields.customid = Number(fields.customid);
            if (err) {
                return next(err);
            }
            try {
                let [receipt, custom] = await Promise.all([
                    //创建收据并更新客户状态
                    payreceiptModel.create({
                        ...fields,
                        status: receiptWaitStatus,
                        createTime: Date.now(),
                    }),
                    customModel.updateOne({
                        cid: fields.customid,
                    }, {
                        $set: {
                            status: cutomDealStatus,
                            dealTime: Date.now(),
                        },
                    }),
                ]);

                let oldPath = files.file.path;
                let imgName = `${receipt.payreceiptid}_${moment().format("YYYYMMDDHHmmss")}.${getFileType(oldPath)}`;
                let newPath = path.join(__dirname, `../public/images/payshot/${imgName}`);
                let finalpath = `http://${APP_HOST}:${APP_PORT}/images/payshot/${imgName}`;

                fs.rename(oldPath, newPath, async function () {
                    let updateResult = await payreceiptModel.updateOne({
                        payreceiptid: receipt.payreceiptid,
                    }, {
                        $set: {
                            shot: finalpath,
                        },
                    });

                    if (receipt && custom && updateResult) {
                        let sender = await userModel.find({
                            account: req.userid,
                        });
                        let messageBody = {
                            from: req.userid,
                            to: appRoleList.find((r) => r.name === "销售经理").id,
                            message: `【新收据/${receipt.payreceiptid}】,请尽快审核`,
                            time: Date.now(),
                        };
                        let socketBody = {
                            type: "newReceipt",
                            id: receipt.payreceiptid,

                            message: sender.name,
                            description: messageBody.message,
                            icon: sender.avatar,

                            messageBody,
                        };
                        res.userSocket().sendMessage({
                            to: "sellerManager",
                            messageBody,
                            socketBody,
                        });

                        res.isuccess();
                    }
                });
            } catch (err) {
                res.ierror("添加收款出错,请重新添加");
            }
        });
    } catch (error) {
        console.log("/addReceipt", error);
    }
});

//收据列表
router.get("/list", async function (req, res) {
    let {
        pageNo,
        pageSize,
        userid,
        startTime,
        endTime,
        fuzzies, //模糊查询字段数组
        ...filters
    } = req.query;
    try {
        let filteredConditions = generateConditions(filters, fuzzies, {
            toNumber: ["creator", "reviewer", "payreceiptid", "status", "orderid", "customid", "way"],
        });
        if (startTime && endTime) {
            //传入了时间
            filteredConditions.$and = [{
                    createTime: {
                        $gt: Number(startTime),
                    },
                },
                {
                    createTime: {
                        $lt: Number(endTime),
                    },
                },
            ];
        }
        console.log("filteredConditions", filteredConditions);
        const [totalCount, list] = await Promise.all([
            payreceiptModel.countDocuments(filteredConditions),
            payreceiptModel
            .aggregate([{
                    $match: filteredConditions,
                },
                {
                    //关联支付客户
                    $lookup: {
                        from: "Customs",
                        localField: "customid",
                        foreignField: "cid",
                        as: "customList",
                    },
                },
                {
                    $addFields: {
                        customInfo: {
                            $ifNull: [{
                                    $arrayElemAt: ["$customList", 0],
                                },
                                {},
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        customName: {
                            $ifNull: ["$customInfo.name", ""],
                        },
                    },
                },
                {
                    //关联创建人
                    $lookup: {
                        from: "Users",
                        localField: "creator",
                        foreignField: "account",
                        as: "creatorInfo",
                    },
                },
                {
                    $unwind: "$creatorInfo",
                },
                {
                    $addFields: {
                        creatorName: "$creatorInfo.name",
                    },
                },
                {
                    //关联审核人
                    $lookup: {
                        from: "Users",
                        localField: "reviewer",
                        foreignField: "account",
                        as: "reviewerList",
                    },
                },
                {
                    $addFields: {
                        reviewerInfo: {
                            $ifNull: [{
                                    $arrayElemAt: ["$reviewerList", 0],
                                },
                                {},
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        reviewerName: {
                            $ifNull: ["$reviewerInfo.name", ""],
                        },
                    },
                },
                {
                    $project: {
                        creatorInfo: 0,
                        customList: 0,
                        customInfo: 0,
                        reviewerList: 0,
                        reviewerInfo: 0,
                        _id: 0,
                        __v: 0,
                    },
                },
            ])
            .sort({
                createTime: -1,
            })
            .skip((Number(pageNo) - 1) * Number(pageSize))
            .limit(Number(pageSize)),
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
                    data: list,
                },
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
                data: [],
            },
        });
    }
});

router.post("/shot", async (req, res) => {
    try {
        let form = new formidable.IncomingForm();

        form.encoding = "utf-8"; // 编码
        form.keepExtensions = true; // 保留扩展名
        form.maxFieldsSize = 2 * 1024 * 1024; //文件大小
        form.uploadDir = path.join(__dirname, "../public/images/payshot/"); //文件存储路径 最后要注意加 '/' 否则会被存在public下

        form.parse(req, async (err, fields, files) => {
            if (err) {
                return next(err);
            }

            let oldPath = files.file.path;
            let imgName = `${fields.payreceiptid}_${moment().format("YYYYMMDDHHmmss")}.${getFileType(oldPath)}`;
            let newPath = path.join(__dirname, `../public/images/payshot/${imgName}`);
            let finalpath = `http://${APP_HOST}:${APP_PORT}/images/payshot/${imgName}`;

            fs.rename(oldPath, newPath, async function () {
                let {
                    shot: preShot
                } = await payreceiptModel.findOneAndUpdate({
                    payreceiptid: Number(fields.payreceiptid),
                }, {
                    $set: {
                        shot: finalpath,
                    },
                }, {
                    new: false, //返回更新前的记录
                });
                if (preShot) {
                    let pngname = preShot.substr(preShot.lastIndexOf("/") + 1);
                    if (pngname) {
                        //删除文件
                        fs.unlink(path.join(__dirname, `../public/images/payshot/${pngname}`), function () {
                            console.log(`删除文件${pngname}成功`);
                        });
                    }
                }
                res.isuccess();
            });
        });
    } catch (err) {
        res.ierror(err.toString());
    }
});

//更新单据(可批量)
router.put("/update", async function (req, res) {
    const {
        payreceiptids,
        ...payload
    } = req.body;
    try {
        let updateSuccess = await payreceiptModel.updateMany({
            payreceiptid: {
                $in: payreceiptids,
            },
        }, {
            $set: payload,
        });

        if (updateSuccess) {
            res.json({
                status: 200,
                msg: "更新成功",
            });
        }
    } catch (error) {
        console.log(error);
        res.json({
            status: 500,
            msg: "更新失败",
        });
    }
});

router.put("/review", async (req, res) => {
    let reviewPassedId = reviewStatusList.find((r) => r.name === "审核通过").id;

    try {
        let {
            payreceiptid,
            status,
            reviewer,
            reviewmark
        } = req.body;
        let passed = reviewPassedId == status; //审核是否通过

        let receiptRecord = await payreceiptModel.findOneAndUpdate({
            payreceiptid,
        }, {
            $set: {
                status,
                reviewer,
                reviewmark,
            },
        });
        let messageBody = {
            from: reviewer,
            to: receiptRecord.creator,
            message: `【收据/${payreceiptid}】审核${passed ? "通过" : "驳回"}`,
        };

        let sender = await userModel.findOne({ //发消息的人
            account: reviewer
        });

        let socketBody = {
            type: "receiptReview",
            id: payreceiptid,
            message: sender.name,
            description: messageBody.message,
            icon: sender.avatar
        };
        res.userSocket(receiptRecord.creator).sendMessage({
            messageBody,
            socketBody
        });
        if (passed) { //通知其他销售,起激励效果
            let roleId = appRoleList.find(r => r.name === '销售员').id;
            let creatorInfo = await userModel.findOne({
                account: receiptRecord.creator
            });
            let messageBody = {
                from: reviewer,
                to: roleId,
                message: `【绩效录入】,恭喜【${creatorInfo.name}】获得绩效${receiptRecord.money}元,期待你的好消息!`,
            }
            res.userSocket(receiptRecord.creator).sendMessage({
                to: 'seller',
                messageBody,
                socketBody: {
                    type: "receiptNotice",
                    id: payreceiptid,
                    message: sender.name,
                    description: messageBody.message,
                    icon: sender.avatar
                }
            });
        }

        res.isuccess();
    } catch (error) {
        console.log(error);
        res.ierror(error);
    }
});

//删除单据
router.delete("/delete", async function (req, res) {
    try {
        let result = await mealModel.deleteOne({
            mid: Number(req.body.mid),
        });
        if (result) {
            res.json({
                status: 200,
                msg: "更新成功",
            });
        }
    } catch (error) {
        res.json({
            status: 400,
            msg: error.message,
        });
    }
});

module.exports = router;