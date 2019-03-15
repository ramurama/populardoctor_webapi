module.exports = {
  AUTH_ADMIN: "/api/v1/auth/admin",
  LOGOUT_ADMIN: "/api/v1/admin/logout",
  AUTH_DOCTOR: "/api/v1/auth/doctor",
  AUTH_CUSTOMER: "/api/v1/auth/customer",
  AUTH_FRONTDESK: "/api/v1/auth/frontdesk",
  ADMIN_LOGIN_STATUS: "/api/v1/auth/admin/loginstatus",

  CHANGE_PASSWORD: "/api/v1/user/changePassword",
  UPDATE_DEVICE_TOKEN: "/api/v1/user/updateDeviceToken",
  SIGNUP_CUSTOMER: "/api/v1/customer/signup",
  USER_VERIFY_OTP: "/api/v1/user/verifyOtp",
  IS_MOBILE_NUMBER_EXISTS: "/api/v1/user/isMobileNumberExists",

  SEND_OTP: "/api/v1/messages/sendOtp",
  SEND_PUSH: "/api/v1/messages/push/",
  SEND_PUSH_ANNOUNCEMENT: "/api/v1/messages/push",

  //admin
  CREATE_SPECIALIZATION: "/api/v1/admin/createSpecialization",
  CREATE_DOCTOR: "/api/v1/admin/createDoctor",
  CREATE_HOSPITAL: "/api/v1/admin/createHospital",
  CREATE_SCHEDULE: "/api/v1/admin/createSchedule",
  GET_DOCTORS: "/api/v1/admin/getDoctors",
  GET_CUSTOMERS: "/api/v1/admin/getCustomers",
  GET_FRONTDESK_USERS: "/api/v1/admin/getFrontdeskUsers",
  GET_HOSPITALS: "/api/v1/admin/getHospitals",

  //customer
  GET_SEARCH_CRITERIA: "/api/v1/customer/getSearchCriteria",
  GET_DOCTORS_LIST: "/api/v1/customer/getDoctorsList",
  GET_DOCTOR_SCHEDULES: "/api/v1/customer/getSchedules",
  GET_TOKENS: "/api/v1/customer/getTokens",
  BLOCK_TOKEN: "/api/v1/customer/blockToken",
  ADD_FAVORITE: "/api/v1/customer/addFavorite",
  REMOVE_FAVORITE: "/api/v1/customer/removeFavorite",
  GET_FAVORITES: "/api/v1/customer/getFavorites",
  BOOK_TOKEN: "/api/v1/customer/bookToken",

  //doctor
  CONFIRM_SCHEDULE: "/api/v1/doctor/confirmSchedule"
};
