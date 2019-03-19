const routes = require("../constants/routes");
const adminService = require("../services/adminService");
const userType = require("../constants/userType");

module.exports = app => {
  app.post(routes.CREATE_DOCTOR, (req, res) => {
    adminService.createDoctor(req.body, status => {
      res.send({ status });
    });
  });

  app.post(routes.CREATE_HOSPITAL, (req, res) => {
    adminService.createHospital(req.body, status => {
      res.send({ status });
    });
  });

  app.post(routes.CREATE_SCHEDULE, (req, res) => {
    adminService.createSchedule(req.body, (status, message) => {
      res.send({ status, message });
    });
  });

  app.post(routes.CREATE_SPECIALIZATION, (req, res) => {
    const { name, iconName } = req.body;
    adminService.createSpecialization(name, iconName, (status, message) => {
      res.send({ status, message });
    });
  });

  app.get(routes.GET_DOCTORS + "/:pageNo/:size", (req, res) => {
    adminService.getDoctors(req.params, data => {
      res.send(data);
    });
  });

  app.get(routes.GET_CUSTOMERS + "/:pageNo/:size", (req, res) => {
    adminService.getUsers(req.params, userType.CUSTOMER, data => {
      res.send(data);
    });
  });

  app.get(routes.GET_FRONTDESK_USERS + "/:pageNo/:size", (req, res) => {
    adminService.getUsers(req.params, userType.FRONTDESK, data => {
      res.send(data);
    });
  });

  app.get(routes.GET_HOSPITALS + "/:location/:pageNo/:size", (req, res) => {
    const { size, pageNo, location } = req.params;
    adminService.getHospitals(location, { size, pageNo }, data => {
      res.send(data);
    });
  });

  app.post(routes.BLOCK_USER, (req, res) => {
    const { userId } = req.body;
    adminService.blockUser(userId, status => {
      res.send({ status });
    });
  });

  app.post(routes.UNBLOCK_USER, (req, res) => {
    const { userId } = req.body;
    adminService.unblockUser(userId, status => {
      res.send({ status });
    });
  });

  app.delete(routes.DELETE_SCHEDULE + "/:scheduleId", (req, res) => {
    const { scheduleId } = req.params;
    adminService.deleteSchedule(scheduleId, status => {
      res.send({ status });
    });
  });

  app.delete(routes.DELETE_TOKEN + "/:scheduleId/:tokenNumber", (req, res) => {
    const { scheduleId, tokenNumber } = req.params;
    adminService.deleteToken(scheduleId, tokenNumber, status => {
      res.send({ status });
    });
  });

  app.post(routes.ADD_TOKEN, (req, res) => {
    const { scheduleId, token } = req.body;
    adminService.addToken(scheduleId, token, (status, message) => {
      res.send({ status, message });
    });
  });
};
