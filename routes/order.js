var express = require("express");
var router = express.Router();
const address = require("address");

var orderModel = require("../models/order");
var neworderModel = require("../models/neworder");
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
router.get("/", function (req, res, next) {
    res.send("respond with a resource");
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
        }, fuzzies);
        filteredConditions.cid = Number(filteredConditions.cid);
        console.log('filteredConditions**************************************', filteredConditions);
        const [totalCount, list] = await Promise.all([
            orderModel.countDocuments(filteredConditions),

            orderModel.aggregate([{
                    $lookup: {
                        from: 'Meals',
                        localField: 'mid',
                        foreignField: 'mid',
                        as: 'mealInfo'
                    }
                }, {
                    $match: filteredConditions,
                },
                {
                    $unwind: '$mealInfo'
                }
            ]).sort({
                _id: -1
            })
            .skip((Number(pageNo) - 1) * Number(pageSize))
            .limit(Number(pageSize))

            // orderModel
            // .find(filteredConditions)
            // .sort({
            //     _id: -1
            // })
            // .skip((Number(pageNo) - 1) * Number(pageSize))
            // .limit(Number(pageSize))
            // .select({
            //     __v: 0,
            //     _id: 0
            // })
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

router.post('/payshot', async function (req, res, next) {
    let form = new formidable.IncomingForm();
    // form.encoding = "utf-8"; // 编码
    // 保留扩展名
    // form.keepExtensions = true;
    //文件存储路径 最后要注意加 '/' 否则会被存在public下
    form.uploadDir = path.join(__dirname, "../public/images/payshot/");
    let updateSucess = false;
    form.parse(req, (err, fields, files) => {
        console.log('fields*********************', fields);
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
                let result = await orderModel.updateOne({
                    oid: Number(fields.orderid)
                }, {
                    $set: {
                        payshot: finalpath
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

router.put("/update", async function (req, res, next) {
    const {
        mid,
        ...payload
    } = req.body;
    try {
        let updateSuccess = await orderModel.updateOne({
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
        let result = await orderModel.updateOne({
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