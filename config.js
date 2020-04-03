exports.StaffStatus = { //员工状态
    Working: 1, //工作中
    Offwork: 2, //暂停业务
    Delete: -1 //已删除员工
}

exports.recordStatus = { //数据库记录的状态
    Delete: -1, //删除状态
    Disable: 0, //禁用状态
    Enable: 1 //启用状态
}

exports.payWay = [{
        icon: "alipay",
        iconcolor: "rgb(22,19,255)",
        value: 1,
        label: "支付宝支付"
    },
    {
        icon: "wechat",
        iconcolor: "rgb(42,162,70)",
        value: 2,
        label: "微信支付"
    },
    {
        icon: "credit-card",
        iconcolor: "rgb(230,0,18)",
        value: 3,
        label: "银行卡"
    }
]

exports.CustomStatusList = [{
        "name": "新客户",
        "color": "#13C2C2",
        "content": "接待经理新录入的客户",
        "sid": 100001,
    },
    {
        "name": "QQ通过",
        "color": "#1890FF",
        "content": "QQ通过",
        "sid": 100002,
    },
    {
        "color": "#52C41A",
        "content": "微信通过",
        "name": "微信通过",
        "sid": 100003,
    },
    {
        "color": "#722ED1",
        "content": "微信通过",
        "name": "联系不上",
        "sid": 100004,
    },
    {
        "color": "#FA541C",
        "content": "有意向",
        "name": "有意向",
        "sid": 100005,
    },
    {
        "color": "#367dbf",
        "content": "有意向",
        "name": "无意向",
        "sid": 100006,
    },
    {
        "color": "#FAAD14",
        "content": "有意向",
        "name": "待通过",
        "sid": 100007,
    },
    {
        "color": "#2F54EB",
        "content": "有意向",
        "name": "已添加",
        "sid": 100008,
    },
    {
        "color": "#F5222D",
        "content": "有意向",
        "name": "已成交",
        "sid": 100009,
    }
]