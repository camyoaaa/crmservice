const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Posts";
const autoIncrement = require("mongoose-auto-increment");
const UserschemaDefine = {
    did: {
        //部门编号
        type: Number,
        require: true
    },
    pid: {
        //岗位编号
        type: Number,
        require: true
    },
    superpid: Number, //上属岗位
    superpname: String, //上属岗位名称
    name: String, //部门名称名称
    content: String, //部门内容描述
    status: Number //部门状态 -1已删除 0已禁用 1启用
};

const UserSchema = new MongooseSchema(UserschemaDefine);


UserSchema.plugin(autoIncrement.plugin, {
    model: CollectionName,
    field: "pid",
    startAt: 100000,
    incrementBy: 1
});
module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);