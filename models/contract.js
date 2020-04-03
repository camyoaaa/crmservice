const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Contracts"; //合同表
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
    mid: { //套餐编号
        type: Number,
        require: true
    },
    creator: { //创建人
        type: Number,
        require: true
    },
    createTime: {
        type: Number,
        require: true,
        default: Date.now
    },
    time: { //签约时间
        type: Number,
        require: true
    },
    money: Number, //成交金额
    got: Number, //已收
    last: Number, //未收
    name: String, //套餐名称
    way: Number, //签约方式
    wayZn: String, //
    url: String, //链接
    shot: String, //截图
    status: Number, //合同状态,审核中,经理未通过,经理通过,法务未通过,法务已通过
    remark: String
};

const UserSchema = new MongooseSchema(UserschemaDefine);

UserSchema.plugin(autoIncrement.plugin, {
    model: CollectionName,
    field: "ctid",
    startAt: 100000,
    incrementBy: 1
});
module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);