const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Rolepermissions";
const autoIncrement = require("mongoose-auto-increment");
const UserschemaDefine = {
    roleEn: {
        //所属菜单
        type: String,
        require: true
    },
    customManage: {
        type: Array,
        default: []
    },
    orderManage: {
        type: Array,
        default: []
    },
    receiptManage: {
        type: Array,
        default: []
    },
    contractManage: {
        type: Array,
        default: []
    },
    aftersaleManage: {
        type: Array,
        default: []
    },
    mealManage: {
        type: Array,
        default: []
    },
    staffManage: {
        type: Array,
        default: []
    }
};

const UserSchema = new MongooseSchema(UserschemaDefine);

let myModel = mongoose.model(CollectionName, UserSchema, CollectionName);

// myModel.find({}).then((docs,err)=>{
//     if(docs.length === 0){
//         myModel.create([
//             {roleEn:''}
//         ],_=>{});
//     }
// });



module.exports = myModel;
// module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);