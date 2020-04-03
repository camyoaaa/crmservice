const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Aftersales";
const autoIncrement = require("mongoose-auto-increment");
const UserschemaDefine = {
    rid: {
        //售后记录id
        type: Number,
        require: true
    },
    cid: {
        type: Number,
        require: true
    },
    isOpen: Number,
    pcshopName: String,
    pcshopUrl: String,
    mbshopName: String,
    shopName: String,
    mbshopUrl: String,
    teachStep: Number, //教学阶段  初级,中级,高级
    activityStatus: Number, //审核中 ,成功
    activityStep: Number, //第几次活动
    remark: String, //备注
    createTime: {
        type: Number,
        default: Date.now
    },
    updateTime: Number,
    isEnd: {
        type: Boolean,
        default: false
    }
};

const UserSchema = new MongooseSchema(UserschemaDefine);


UserSchema.plugin(autoIncrement.plugin, {
    model: CollectionName,
    field: "rid",
    startAt: 100000,
    incrementBy: 1
});
module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);