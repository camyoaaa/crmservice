var express = require("express");
var router = express.Router();

var userModel = require("../models/user");
var postModel = require("../models/post");

const {
    StaffStatus,
    StaffMatchs
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
        let addSuccess = await userModel.create(req.body);
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
        contact,
        fuzzies, //模糊查询字段数组
        ...filters
    } = req.query;
    try {
        let filteredConditions = generateConditions(filters, fuzzies, {
            toNumber: ['department', 'post', 'account']
        });

        if (contact) { //如果传入联系方式
            let NumberedContact = Number(contact)
            let emailRegExp = /^([a-zA-Z]|[0-9])(\w|\-)+@[a-zA-Z0-9]+\.([a-zA-Z]{2,4})$/;
            if (emailRegExp.test(contact)) {
                filteredConditions.email = new RegExp(contact)
            } else if (isNaN(NumberedContact)) { //只有微信号不能转化为数字
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
                    }
                ]
            }
        }
        const [totalCount, list] = await Promise.all([
            userModel.countDocuments(filteredConditions),
            userModel.aggregate([{
                    $match: filteredConditions
                },
                {
                    $lookup: {
                        from: 'Departments',
                        localField: 'department',
                        foreignField: 'did',
                        as: 'department_doc'
                    }
                },
                {
                    $unwind: '$department_doc'
                },
                {
                    $lookup: {
                        from: 'Posts',
                        localField: 'post',
                        foreignField: 'pid',
                        as: 'post_doc'
                    }
                },
                {
                    $unwind: '$post_doc'
                },
            ]).sort({
                _id: -1
            }).skip((Number(pageNo) - 1) * Number(pageSize))
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

router.put("/updateOne", async function (req, res, next) {
    const {
        account,
        ...payload
    } = req.body;
    try {
        let updateSuccess = await userModel.updateOne({
            account
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

router.put("/updateMany", async function (req, res, next) {
    const {
        accounts,
        ...payload
    } = req.body;
    try {
        let updateSuccess = await userModel.updateMany({
            account: {
                $in: accounts
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
        res.json({
            status: 500,
            msg: "更新失败"
        });
    }
});

//删除员工
router.delete("/delete", async function (req, res, next) {
    try {
        console.log('req.body.accounts', req.body.accounts);
        let result = await userModel.deleteMany({
            account: {
                $in: req.body.accounts
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

router.get("/filter", async function (req, res, next) {
    const {
        did,
        pid,
        querypchilren,
        onduty
    } = req.query;
    let condition = {};
    if (did) {
        condition.department = Number(did);
    }
    if (pid) {
        if (querypchilren == 'true') { //查询该岗位下的下属岗位
            let chirenpids = (await postModel.find({
                superpid: Number(pid)
            }).select({
                'pid': 1,
                _id: 0
            }) || []).map(i => i.pid);
            if (chirenpids.length > 0) {
                condition.post = {
                    $in: chirenpids
                };
            }
        } else {
            condition.post = pid
        }
    }
    // if (onduty == 'true') {
    //     condition.status = StaffStatus.Working
    // }
    try {
        let result = await userModel.find({}).where(condition).sort('status lastTaskTime');
        res.json({
            status: 200,
            result: {
                data: result
            }
        });
    } catch (error) {
        console.log('error', error);
        res.json({
            status: 404,
            msg: "未查询到用户信息",
            info: null
        });
    }
});

module.exports = router;