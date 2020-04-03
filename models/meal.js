const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Meals";
const autoIncrement = require("mongoose-auto-increment");
const UserschemaDefine = {
    mid: {
        //套餐编号
        type: Number,
        require: true
    },
    name: String, //套餐名称
    minDeposit: String, //最低定金
    price: Number, //价格
    content: Array, //套餐内容,业务id数组
    contentZn: Array, //套餐内容,业务名称数组
    activity: { //活动次数
        type: Number,
        default: 0
    },
    status: Number //套餐生效 NormalStatus,deleteStatus
};

const UserSchema = new MongooseSchema(UserschemaDefine);

/**TaskSchema权限设置**/
UserSchema.set("toJSON", {
    // toJSON时能够转换
    getters: true,
    virtuals: true
});
UserSchema.set("toObject", {
    // toObject时能够转换
    getters: true,
    virtuals: true
});

UserSchema.plugin(autoIncrement.plugin, {
    model: CollectionName,
    field: "mid",
    startAt: 100000,
    incrementBy: 1
});
module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);