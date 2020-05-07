const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Permissions";
const autoIncrement = require("mongoose-auto-increment");
const UserschemaDefine = {
    belong: {
        //所属菜单
        type: String,
        require: true
    },
    pid: {
        //权限编号
        type: Number,
        require: true
    },
    label: {
        type: String,
        default: ''
    },
    value: {
        type: String,
        default: ''
    }
};

const UserSchema = new MongooseSchema(UserschemaDefine);


UserSchema.plugin(autoIncrement.plugin, {
    model: CollectionName,
    field: "pid",
    startAt: 100000,
    incrementBy: 1
});
let myModel = mongoose.model(CollectionName, UserSchema, CollectionName);

module.exports = myModel;
// module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);