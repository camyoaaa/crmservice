const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Neworders";
const autoIncrement = require("mongoose-auto-increment");
const UserschemaDefine = {
    oid: {
        //订单
        type: Number,
        require: true
    },
    cid: {
        type: Number,
        require: true
    }, //客户id
    premids: { //以前的套餐列表
        type: Array,
        default: null
    },
    mid: { //套餐id
        type: Number,
        require: true
    },
    amount: {
        type: Number, //订单金额
        default: 0
    },
    creator: {
        type: Number //订单创建人
    },
    remark: String, //备注
    createTime: { //创建订单时间
        type: Number,
        default: Date.now
    },
    upgradeTime: { //升级订单时间
        type: Number,
        default: null
    }
};

const UserSchema = new MongooseSchema(UserschemaDefine);


UserSchema.plugin(autoIncrement.plugin, {
    model: CollectionName,
    field: "oid",
    startAt: 100000,
    incrementBy: 1
});
module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);