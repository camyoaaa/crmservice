exports.generateConditions = function (params, fuzzies = [], typechange = {}) {
    const {
        toNumber //转换为Number
    } = typechange;
    for (const key in params) {
        let value = params[key];
        if (!value) { //如果键值为空值,则删除该键值对
            delete params[key];
        } else {
            if (Array.isArray(toNumber) && toNumber.includes(key)) {
                params[key] = Number(params[key]);
            }
            if (fuzzies.includes(key)) {
                params[key] = new RegExp(value);
            }
        }
    }
    return params;
};

const getHourMillisecond = function (atHour) { //获取当天的上班开始时间的毫秒值
    return new Date().setHours(atHour, 0, 0)
}
exports.getHourMillisecond = getHourMillisecond;
exports.getDataStatisticsTime = function (startStatistics = 0) { //默认数据重新统计时间为当天0点整
    return getHourMillisecond(startStatistics);
}

exports.buildTree = function (treeData, rootkey = 100000) {
    console.log("treeData********************", treeData);

    let parentstore = {};
    let childstore = {};
    treeData.forEach(element => {
        element = {
            ...element,
            title: element.name,
            value: element.mid,
            key: element.mid
        };
        childstore[element.mid] = element;
        if (Array.isArray(parentstore[element.pid])) {
            parentstore[element.pid].push(element);
        } else {
            parentstore[element.pid] = [element];
        }
    });

    for (let key in childstore) {
        childstore[key].children = parentstore[childstore[key].mid];
    }
    console.log("childstore********************", childstore);
    return [childstore[rootkey]];
}