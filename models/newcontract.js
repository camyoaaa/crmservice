const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Newcontracts"; //合同表
const autoIncrement = require("mongoose-auto-increment");
const UserschemaDefine = {
    ctid: {
        //合同编号
        type: Number,
        require: true
    },
    cid: { //客户编号
        type: Number,
        require: true
    },
    orderid: { //订单编号 //一个订单一个合同
        type: Number,
        require: true
    },
    creator: { //创建人
        type: Number,
        require: true
    },
    reviewer: { //审核人
        type: Number,
        require: true
    },
    createTime: { //合同录入时间
        type: Number,
        require: true,
        default: Date.now
    },
    url: { //合同地址
        type: String,
        default: ''
    },
    shot: { //合同截图
        type: String,
        default: ''
    },
    way: Number, //签约方式  1 法大大店子合同 2现场签约
    status: Number, //合同状态,审核中,经理未通过,经理通过,法务未通过,法务已通过  // 1审核中 2通过 3未通过
    remark: {
        type: String,
        default: ''
    }
};

const UserSchema = new MongooseSchema(UserschemaDefine);

UserSchema.plugin(autoIncrement.plugin, {
    model: CollectionName,
    field: "ctid",
    startAt: 100000,
    incrementBy: 1
});
module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);