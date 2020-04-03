const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Menus";
const autoIncrement = require("mongoose-auto-increment");
const UserschemaDefine = {
    pid: {
        //父级
        type: Number
    },
    mid: {
        //菜单id
        type: Number,
        require: true
    },
    parents: Array, //父节点数组
    parentsPath: {
        type: String,
        default: ''
    }, //父节点路径
    name: {
        type: String,
        default: ''
    },
    enableDepartmentPost: Array,
    enableDepartmentPostTags: {
        type: String,
        default: ''
    },
    path: {
        type: String,
        default: ''
    }, //菜单路径
    redirect: {
        type: String,
        default: ''
    }, //菜单重定向
    showside: { //是否在侧边栏显示
        type: Boolean,
        default: true
    },
    content: {
        type: String,
        default: ''
    },
    icon: {
        type: String,
        default: ''
    },
    status: Number //菜单状态 -1已删除 0已警用 1启用
};

const UserSchema = new MongooseSchema(UserschemaDefine);


UserSchema.plugin(autoIncrement.plugin, {
    model: CollectionName,
    field: "mid",
    startAt: 100000,
    incrementBy: 1
});
module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);