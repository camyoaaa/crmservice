const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Departments";
const autoIncrement = require("mongoose-auto-increment");
const UserschemaDefine = {
    did: {
        //部门编号
        type: Number,
        require: true
    },
    name: String, //部门名称名称
    icon: String, //图标
    content: String, //部门内容描述
    status: Number //部门状态 -1已删除 0已警用 1启用
};

const UserSchema = new MongooseSchema(UserschemaDefine);


UserSchema.plugin(autoIncrement.plugin, {
    model: CollectionName,
    field: "did",
    startAt: 100000,
    incrementBy: 1
});
module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);