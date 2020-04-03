const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "CustomStatus";
const autoIncrement = require("mongoose-auto-increment");
const UserschemaDefine = {
    sid: {
        //套餐编号
        type: Number,
        require: true
    },
    color: String,
    order: Number, //排序
    name: String, //状态名称
    isdefault: Boolean, //是否默认状态
    content: String, //业务内容描述
    status: Number //套餐生效 -1已删除 0已停止 1启用
};

const UserSchema = new MongooseSchema(UserschemaDefine);


UserSchema.plugin(autoIncrement.plugin, {
    model: CollectionName,
    field: "sid",
    startAt: 100000,
    incrementBy: 1
});
module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);