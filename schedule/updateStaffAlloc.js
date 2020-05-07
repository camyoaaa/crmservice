const schedule = require('node-schedule');

const userModel = require('../models/user');

module.exports = scheduleCronstyle = () => {
    //每天0时0分0秒定时执行一次:
    schedule.scheduleJob('0 0 0 * * *', async () => {
        console.log('scheduleJob start');
        try {
            let result = await userModel.updateMany({}, {
                $set: {
                    todayRecepted: 0
                }
            });
            console.log(result);
        } catch (error) {
            console.log(error)
        }

    });

}