var express = require("express");
var router = express.Router();

var messageModel = require("../models/message");
var userModel = require('../models/user');
const {
    generateConditions
} = require("../tool");

/* GET users listing. */
router.get("/", function (req, res, next) {
    res.send("respond with a resource");
});

router.post("/add", async function (req, res, next) {
    try {
        req.body.from = Number(req.body.from);
        req.body.to = null; //通知所有人
        await messageModel.create(req.body);
        res.systemSocket().sendMessage({
            broadcast: true,
            socketBody: {
                message: '系统通知',
                description: req.body.message,
                permission: 'system'
            }
        });
        res.isuccess();
    } catch (error) {
        console.log(error);
        res.ierror(error);
    }
});

router.get("/list", async function (req, res, next) {
    let filtersCondition = generateConditions(req.query, [], {
        toNumber: ['status']
    });
    // filtersCondition.to = req.userid;
    let findresult = await userModel.findOne({
        account: req.userid
    });
    filtersCondition.$or = [{
            to: req.userid
        },
        {
            to: findresult.role
        },
        {
            to: null
            // $eq: ['$to', null]
        }
    ]
    console.log('filtersCondition', filtersCondition);
    try {


        const list = await messageModel.aggregate([{
                $match: filtersCondition,
            }, { //关联发消息的用户
                $lookup: {
                    from: 'Users',
                    localField: 'from',
                    foreignField: 'account',
                    as: 'fromList'
                }
            },
            {
                $addFields: {
                    fromInfo: {
                        $ifNull: [{
                            $arrayElemAt: ['$fromList', 0]
                        }, {}]
                    }
                }
            }
        ]).sort('-time');
        res.isuccess(list);
    } catch (error) {
        console.log(error);
        res.ierror(error);
    }
});

//更新消息 (可批量)
router.put("/update", async function (req, res, next) {
    const {
        mids,
        ...payload
    } = req.body;
    try {
        let updateSuccess = await messageModel.updateMany({
            mid: {
                $in: mids
            }
        }, {
            $set: payload
        });
        console.log(updateSuccess);
        updateSuccess && res.isuccess();
    } catch (error) {
        res.ierror(error);
    }
});

//删除套餐(可批量)
router.delete("/delete", async function (req, res, next) {
    try {
        let result = await messageModel.deleteMany({
            mid: {
                $in: req.body.mids
            }
        });
        result && res.isuccess();
    } catch (error) {
        res.isuccess(error);
    }
});


module.exports = router;