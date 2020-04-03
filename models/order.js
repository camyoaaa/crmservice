const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Orders";
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
    mid: { //套餐id
        type: Number,
        require: true
    },
    paymoney: Number,
    payway: Number, //
    payshot: String, //付款截图
    remark: String, //备注
    createTime: {
        type: Number,
        default: Date.now
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