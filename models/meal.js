const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Meals";
const autoIncrement = require("mongoose-auto-increment");
const UserschemaDefine = {
    pmid: { //父级套餐编号
        type: Number,
        default: null
    },
    mid: { //套餐编号
        type: Number,
        require: true
    },
    name: { //套餐名称
        type: String,
        default: ''
    },
    minDeposit: { //最低定金
        type: Number,
        default: null
    },
    price: { //价格
        type: Number,
        default: null
    },
    content: { //套餐内容,业务id数组
        type: String,
        default: ''
    },
    activity: { //活动次数
        type: Number,
        default: 0
    },
    status: {
        type: Number,
        default: 1
    } //套餐生效 1启用 2禁用
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