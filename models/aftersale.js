const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Aftersales";
const autoIncrement = require("mongoose-auto-increment");
const UserschemaDefine = {
    rid: {
        //售后记录id
        type: Number,
        require: true
    },
    orderid: { //订单id
        type: Number,
        require: true
    },
    cid: { //客户id
        type: Number,
        require: true
    },
    distributor: { //售后分配人
        type: Number,
        require: true
    },
    executor: { //售后处理人
        type: Number,
        require: true
    },
    isOpen: { //是否营业 1未知 2营业 3未营业
        type: Number,
        default: 1
    },
    shopName: { //店铺名称
        type: String,
        default: '未录入'
    },
    pcshopUrl: { //pc端店铺地址
        type: String,
        default: 'http://'
    },
    mbshopUrl: { //手机端店铺地址
        type: String,
        default: 'http://'
    },
    teachStep: { //教学阶段  未开始,初级,中级,高级
        type: Number,
        default: 1
    },
    activityStatus: { //未开始,审核中 ,成功
        type: Number,
        default: 1
    },
    activityStep: { //第几次活动
        type: Number,
        default: 0
    },
    remark: { //备注
        type: String,
        default: ''
    },
    createTime: { //创建时间
        type: Number,
        default: Date.now
    },
    isEnd: { //全部完成 1是 2否
        type: Number,
        default: 2
    },
    endTime: {
        type: Number,
        default: Date.now
    }
};

const UserSchema = new MongooseSchema(UserschemaDefine);


UserSchema.plugin(autoIncrement.plugin, {
    model: CollectionName,
    field: "rid",
    startAt: 100000,
    incrementBy: 1
});
module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);