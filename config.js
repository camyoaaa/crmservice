//应用角色列表
exports.appRoleList = [{
        id: 1,
        name: '管理员',
        en: 'admin',
        describe: '拥有所有权限'
    },
    {
        id: 2,
        name: '接待员',
        en: 'receptionist',
        describe: '拥有接待客户权限'
    },
    {
        id: 3,
        name: '销售经理',
        en: 'sellerManager',
        describe: '拥有客户分配及收据,合同审核权限'
    },
    {
        id: 4,
        name: '销售员',
        en: 'seller',
        describe: '拥有跟进客户,签单,收退款,签合同等权限'
    },
    {
        id: 5,
        name: '售后经理',
        en: 'aftersaleManager',
        describe: '拥有订单分配等权限'
    },
    {
        id: 6,
        name: '售后员',
        en: 'aftersale',
        describe: '拥有订单跟进,售后处理等权限'
    },
]


//客户状态
exports.customStatusList = [{
        id: 0,
        "name": "新客户",
        "color": "#13C2C2"
    },
    {
        id: 1,
        "name": "QQ通过",
        "color": "#1890FF",
    },
    {
        id: 2,
        "color": "#52C41A",
        "name": "微信通过",
    },
    {
        id: 3,
        "color": "#722ED1",
        "name": "联系不上",
    },
    {
        id: 4,
        "color": "#FA541C",
        "name": "有意向",
    },
    {
        id: 5,
        "color": "#367dbf",
        "name": "无意向",
    },
    {
        id: 6,
        "color": "#FAAD14",
        "name": "待通过",
    },
    {
        id: 7,
        "color": "#2F54EB",
        "name": "已添加"
    },
    {
        id: 8,
        "color": "#F5222D",
        "name": "已成交"
    }
]

//员工状态
exports.staffStatusList = [{
        id: 1,
        name: '暂停业务'
    },
    {
        id: 2,
        name: '正在工作'
    }
]

//审核状态
exports.reviewStatusList = [{
        id: 0,
        name: '等待审核'
    },
    {
        id: 1,
        name: '审核通过'
    },
    {
        id: 2,
        name: '审核驳回'
    }
]

exports.contractList = [{
        id: 1,
        name: '法大大电子合同'
    },
    {
        id: 2,
        name: '现场签约'
    }
]

exports.shopStatusList = [{
        id: 1,
        name: '未知'
    },
    {
        id: 2,
        name: '已营业'
    },
    {
        id: 3,
        name: '未营业'
    }
]

exports.teachStatusList = [{
        id: 1,
        name: '未开始'
    },
    {
        id: 2,
        name: '初级阶段'
    },
    {
        id: 3,
        name: '中级阶段'
    },
    {
        id: 4,
        name: '高级阶段'
    }
]

exports.activeStatusList = [{
        id: 1,
        name: '未开始',
        status: 'warning'
    },
    {
        id: 2,
        name: '审核中',
        status: 'processing'
    },
    {
        id: 3,
        name: '已完成',
        status: 'success'
    }
]

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