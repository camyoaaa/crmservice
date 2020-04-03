const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Businesss";
const autoIncrement = require("mongoose-auto-increment");
const UserschemaDefine = {
    bid: {
        //套餐编号
        type: Number,
        require: true
    },
    name: String, //业务名称名称
    content: String, //业务内容描述
    status: Number //套餐生效 -1已删除 0已停止 1启用
};

const UserSchema = new MongooseSchema(UserschemaDefine);


UserSchema.plugin(autoIncrement.plugin, {
    model: CollectionName,
    field: "bid",
    startAt: 100000,
    incrementBy: 1
});
module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);