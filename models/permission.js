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

myModel.find({}).then((doc, err) => {
    if (doc.length === 0) {
        let Permissionslist = [{
                belong: 'customManage',
                label: '查询/查看',
                value: 'search'
            },
            {
                belong: 'customManage',
                label: '添加',
                value: 'add'
            },
            {
                belong: 'customManage',
                label: '跟进',
                value: 'follow'
            },
            {
                belong: 'customManage',
                label: '直改状态',
                value: 'changestatus'
            },
            {
                belong: 'customManage',
                label: '签单',
                value: 'order'
            },
            {
                belong: 'customManage',
                label: '分配/转移',
                value: 'alloc'
            },
            {
                belong: 'orderManage',
                label: '查询/查看',
                value: 'search'
            },
            {
                belong: 'orderManage',
                label: '分配/转移',
                value: 'alloc'
            },
            {
                belong: 'orderManage',
                label: '收款/退款',
                value: 'receipt'
            },
            {
                belong: 'orderManage',
                label: '签订合同',
                value: 'contract'
            },
            {
                belong: 'orderManage',
                label: '升级订单',
                value: 'upgrade'
            },
            {
                belong: 'receiptManage',
                label: '查询/查看',
                value: 'search'
            },
            {
                belong: 'receiptManage',
                label: '审核',
                value: 'review'
            },
            {
                belong: 'receiptManage',
                label: '更正',
                value: 'modify'
            },
            {
                belong: 'contractManage',
                label: '查询/查看',
                value: 'search'
            },
            {
                belong: 'contractManage',
                label: '审核',
                value: 'review'
            },
            {
                belong: 'contractManage',
                label: '更正',
                value: 'modify'
            },
            {
                belong: 'aftersaleManage',
                label: '查询/查看',
                value: 'search'
            },
            {
                belong: 'aftersaleManage',
                label: '跟进',
                value: 'follow'
            },
            {
                belong: 'mealManage',
                label: '查询/查看',
                value: 'search'
            },
            {
                belong: 'mealManage',
                label: '新增菜单',
                value: 'add'
            },
            {
                belong: 'mealManage',
                label: '修改菜单',
                value: 'modify'
            },
            {
                belong: 'mealManage',
                label: '删除菜单',
                value: 'delete'
            },
            {
                belong: 'staffManage',
                label: '查询/查看',
                value: 'search'
            },
            {
                belong: 'staffManage',
                label: '编辑员工',
                value: 'modify'
            },
            {
                belong: 'staffManage',
                label: '删除员工',
                value: 'delete'
            },
            {
                belong: 'staffManage',
                label: '新增员工',
                value: 'add'
            }
        ];
        myModel.create(...Permissionslist, _ => {});
    }
});



module.exports = myModel;
// module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);