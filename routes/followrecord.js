var express = require("express");
var router = express.Router();

var folllowModel = require("../models/followrecord");

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

router.post("/add", async function (req, res, next) {

    try {
        let addSuccess = await folllowModel.create({
            ...req.body,
            createTime: Date.now()
        });
        if (addSuccess) {
            res.json({
                status: 200,
                msg: "新增成功"
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
        let filteredConditions = generateConditions(filters, fuzzies);
        if (filteredConditions.cid) {
            filteredConditions.cid = Number(filteredConditions.cid)
        }
        console.log('filteredConditions********************', filteredConditions);
        const [totalCount, list] = await Promise.all([
            folllowModel.countDocuments(filteredConditions),
            folllowModel.aggregate([{
                    $lookup: {
                        from: 'Users',
                        localField: 'uid',
                        foreignField: 'account',
                        as: 'recordUser'
                    }
                },
                {
                    $match: filteredConditions
                },
                {
                    $unwind: '$recordUser'
                }
            ]).sort({
                _id: -1
            })
            .skip((Number(pageNo) - 1) * Number(pageSize))
            .limit(Number(pageSize))
        ]);
        if (true) {
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



module.exports = router;