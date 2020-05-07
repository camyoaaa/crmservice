const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Messages";
const autoIncrement = require("mongoose-auto-increment");
const UserschemaDefine = {
    mid: { //消息编号
        type: Number,
        default: null
    },
    from: {
        type: Number,
        default: null
    },
    to: {
        type: Number,
        default: null
    },
    message: {
        type: String,
        default: ''
    },
    status: {
        type: Number,
        default: 1 // 1未读,已读
    },
    time: {
        type: Number,
        default: Date.now
    }
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