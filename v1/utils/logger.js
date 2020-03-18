const Bunyan = require('bunyan');

const levelMap = {
  development: 'trace',
  test: 'error',
  production: 'trace'
};

const logger = Bunyan.createLogger({
  name: 'Popular Doctor',
  streams: [
    {
      level: levelMap[process.env.NODE_ENV],
      type: 'rotating-file',
      path: './logs/pd.log',
      period: '1d', // daily rotation
      count: 5 // keep 5 back copies
    }
  ]
});

//Set the logger object to be accessible across the app
global.logger = logger;

module.exports = logger;
