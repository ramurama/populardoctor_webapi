const routes = require("../constants/routes");
const messageService = require("../services/messageService");
const firebaseTopics = require("../constants/firebaseTopics");

module.exports = app => {
  app.post(routes.SEND_PUSH + ":mobile", (req, res) => {
    messageService.sendPushNotificationByUser(
      req.params.mobile,
      req.body.title,
      req.body.body
    );
    res.send();
  });
  app.post(routes.SEND_PUSH_ANNOUNCEMENT, (req, res) => {
    messageService.sendPushNotificationByTopic(
      firebaseTopics.ANNOUNCEMENTS,
      req.body.title,
      req.body.body
    );
    res.send();
  });
};
