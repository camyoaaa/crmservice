const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Followrecords";
const autoIncrement = require("mongoose-auto-increment");
const UserschemaDefine = {
    rid: {
        //记录编号
        type: Number,
        require: true
    },
    cid: Number, //客户id
    uid: Number, //用户id
    createTime: {
        type: Number,
        default: Date.now
    },
    comment: String //记录内容
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
    field: "rid",
    startAt: 100000,
    incrementBy: 1
});
module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);