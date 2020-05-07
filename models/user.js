const mongoose = require("mongoose");
const MongooseSchema = mongoose.Schema;
const CollectionName = "Users";
const autoIncrement = require("mongoose-auto-increment");

const address = require('address');
const {
    APP_HOST,
    APP_PORT
} = require('../systemConfig');
const UserschemaDefine = {
    account: {
        //员工编号
        type: Number,
        require: true
    },
    password: {
        type: String,
        require: true
    },
    workin: { //工作时间
        type: Array,
        default: ''
    },
    name: {
        type: String,
        require: true
    },
    role: { //员工角色
        type: Number,
        require: true
    },
    avatar: { //头像
        type: String,
        default: `http://${APP_HOST}:${APP_PORT}/images/avatar/avatar.png`
    },
    phone: {
        type: String,
        default: ''
    },
    wx: {
        type: String,
        default: ''
    },
    qq: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    status: { //员工状态 1工作中,2未工作
        type: Number,
        default: 2
    },
    daily: { //日常任务量
        type: Number,
        default: ''
    },
    lastLoginTime: { //上次登陆时间
        type: Number,
        default: ''
    },
    lastLoginIP: { //上次登录ip
        type: String,
        default: ''
    },
    lastTaskTime: { //上次接收任务时间
        type: Number,
        default: 0
    },
    todayRecepted: { //今日已接收任务数量
        type: Number,
        default: 0
    },
    rememberMe: { //记住用户 0否 1是
        type: Number,
        default: 0
    }

};

const UserSchema = new MongooseSchema(UserschemaDefine);
UserSchema.plugin(autoIncrement.plugin, {
    model: CollectionName,
    field: "account",
    startAt: 100000,
    incrementBy: 1
});
module.exports = mongoose.model(CollectionName, UserSchema, CollectionName);