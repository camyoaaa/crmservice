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
    money: {
        type: Number, //订单金额
        default: 0
    },
    creator: {
        type: Number, //订单创建人
        default: null
    },
    distributor: {
        type: Number, //订单分配人
        default: null
    },
    lastExecutor: { //上一执行人
        type: Number,
        default: null
    },
    executor: {
        type: Number, //执行人
        default: null
    },
    remark: String, //备注
    createTime: { //创建订单时间
        type: Number,
        default: Date.now
    },
    allocTime: { //订单分配时间
        type: Number,
        default: null
    },
    upgradeTime: { //升级订单时间
        type: Number,
        default: null
    },
    doneTime: { //订单完成时间
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