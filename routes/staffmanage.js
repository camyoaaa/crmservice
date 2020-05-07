var express = require("express");
var router = express.Router();

var userModel = require("../models/user");
var postModel = require("../models/post");

const {
    appRoleList
} = require('../config');

const {
    generateConditions
} = require("../tool");

/* GET users listing. */
router.get("/", function (req, res, next) {
    res.send("respond with a resource");
});


//新增员工
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

//获取员工列表
router.get("/list", async function (req, res, next) {
    let {
        pageNo,
        pageSize,
        contact,
        fuzzies, //模糊查询字段数组
        sorterList,
        ...filters
    } = req.query;
    let sortPipeLine = {};
    (sorterList && sorterList.length > 0 ? sorterList : [{
        "sortField": "_id",
        "sortOrder": "asc"
    }]).forEach((sort = {}) => {
        console.log(sort);
        sort = typeof sort === 'object' ? sort : JSON.parse(sort);
        if (sort.sortField && sort.sortOrder) {
            sortPipeLine[sort.sortField] = sort.sortOrder
        }
    });
    console.log('sortPipeLine', sortPipeLine);
    try {
        let filteredConditions = generateConditions(filters, fuzzies, {
            toNumber: ['role', 'status', 'account']
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
            userModel.find(filteredConditions).sort(sortPipeLine).skip((Number(pageNo) - 1) * Number(pageSize))
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

//更新员工(可批量)
router.put("/update", async function (req, res, next) {
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

//删除员工(可批量)
router.delete("/delete", async function (req, res, next) {
    try {
        let result = await userModel.deleteMany({
            account: {
                $in: req.body.accounts
            }
        });
        if (result) {
            res.json({
                status: 200,
                msg: "删除成功"
            });
        }
    } catch (error) {
        res.json({
            status: 400,
            msg: error.message
        });
    }
});

//获取销售列表
router.get('/seller', async (req, res) => {
    try {
        let result = userModel.find({}).where({
            role: appRoleList.find(r => r.name === '销售员')
        }).sort('status lastTaskTime').select({
            _id: 0,
            __v: 0
        });
        res.isuccess(result);
    } catch (error) {
        res.ierror('未查询要销售员列表')
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