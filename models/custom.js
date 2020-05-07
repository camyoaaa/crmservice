const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Customs";
const autoIncrement = require("mongoose-auto-increment");
const UserschemaDefine = {
    cid: {
        //客户编号
        type: Number,
        require: true
    },
    name: {
        type: String,
        default: ''
    },
    from: {
        type: Number,
        default: ''
    }, //客户来源
    phone: {
        type: String,
        default: ''
    }, //联系方式
    wx: {
        type: String,
        default: ''
    },
    qq: {
        type: String,
        default: ''
    },
    idcard: { //身份证
        type: String,
        default: ''
    },
    address: { //详细地址
        type: String,
        default: ''
    },
    province: { //省
        type: String,
        default: ''
    },
    city: { //市
        type: String,
        default: ''
    },
    county: { //区县
        type: String,
        default: ''
    },
    status: { // -1 无意向  0新客户 ,1 QQ通过 ,2微信通过,
        type: Number,
        default: ''
    },
    receptionist: { //接待员
        type: Number,
        default: ''
    },
    sellerManager: { //售前经理/销售经理
        type: Number,
        default: ''
    },
    seller: { //销售员/售前
        type: Number,
        default: ''
    },
    lastSeller: { //上一销售员
        type: Number,
        default: ''
    },
    remark: { //备注
        type: String,
        default: ''
    },
    receptTime: { //客户录入时间
        type: Number,
        default: ''
    },
    updateTime: { //更新时间
        type: Number,
        default: ''
    }
};

const UserSchema = new MongooseSchema(UserschemaDefine);
UserSchema.plugin(autoIncrement.plugin, {
    model: CollectionName,
    field: "cid",
    startAt: 100000,
    incrementBy: 1
});
module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);