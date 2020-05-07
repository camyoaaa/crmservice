var express = require("express");
var router = express.Router();

var mealModel = require("../models/meal");

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
        await mealModel.create(req.body);
        res.isuccess();
    } catch (error) {
        console.log(error);
        res.ierror(error);
    }
});

router.get("/list", async function (req, res, next) {
    try {
        const list = await mealModel.aggregate([{
                $match: {
                    pmid: null
                }
            },
            {
                $lookup: {
                    from: 'Meals',
                    localField: 'mid',
                    foreignField: 'pmid',
                    as: 'childMealList'
                }
            },
            {
                $addFields: {
                    childMealList1: {
                        $cond: {
                            if: {
                                $arrayElemAt: ['$childMealList', 0]
                            },
                            then: '$childMealList',
                            else: [{}]
                        }
                    }
                }
            },
            {
                $project: {
                    childMealList: 0
                }
            },
            {
                $unwind: "$childMealList1"
            },
            {
                $lookup: {
                    from: 'Neworders',
                    localField: 'childMealList1.mid',
                    foreignField: 'mid',
                    as: 'childMealList1.orderList'
                }
            },
            {
                $addFields: {
                    'childMealList1.orderNumber': {
                        $size: '$childMealList1.orderList'
                    }
                }
            },
            {
                $group: {
                    _id: '$mid',
                    mid: {
                        $first: "$mid"
                    },
                    price: {
                        $first: '$price'
                    },
                    pmid: {
                        $first: '$pmid'
                    },
                    name: {
                        $first: '$name'
                    },
                    minDeposit: {
                        $first: '$minDeposit'
                    },
                    content: {
                        $first: '$content'
                    },
                    activity: {
                        $first: '$activity'
                    },
                    status: {
                        $first: '$status'
                    },
                    childMealList: {
                        $push: '$childMealList1'
                    }
                }
            }
        ]).sort('mid');
        res.isuccess(list);

    } catch (error) {
        res.ierror(error);
    }
});

//更新菜单 (可批量)
router.put("/update", async function (req, res, next) {
    const {
        mids,
        ...payload
    } = req.body;
    try {
        let updateSuccess = await mealModel.updateMany({
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
        let result = await mealModel.deleteMany({
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