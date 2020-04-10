//收据(业绩)
const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Payreceipts";
const autoIncrement = require("mongoose-auto-increment");
const UserschemaDefine = {
    payreceiptid: {
        //收据
        type: Number,
        require: true
    },
    orderid: { //订单id
        type: Number,
        require: true
    },
    customid: { //客户id
        type: Number,
        require: true
    },
    content: { //收款内容  1定金 2 中款 3 尾款
        type: String,
        require: true
    },

    way: { //收款方式
        type: Number, //1支付宝 2 微信 3 银行卡
        require: true
    },
    account: {
        type: Number, //收款账号
        require: true
    },
    money: {
        type: Number, //收款金额
        require: true
    },
    shot: {
        type: String, //收款截图
        require: true,
        default: ''
    },
    status: {
        type: Number, //1待审核 2 审核通过
        default: 1
    },
    reviewer: { //审核人
        type: Number,
        default: null
    },
    reviewmark: { //审核备注
        type: String,
        default: ''
    },
    creator: { //单据创建人
        type: Number,
        default: null,
        require: true
    },
    createTime: { //单据创建时间
        type: Number,
        default: Date.now
    }
};

const UserSchema = new MongooseSchema(UserschemaDefine);


UserSchema.plugin(autoIncrement.plugin, {
    model: CollectionName,
    field: "payreceiptid",
    startAt: 100000,
    incrementBy: 1
});
module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);