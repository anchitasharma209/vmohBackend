const express = require("express");
const users = require("../controllers/userControlles");
const router = express.Router();
const verifyToken = require("../middlewares/auth");

router.post("/signup", users.signUp);
router.post("/login", users.login);
router.post("/verifyotp", users.verifyOtp);
router.post("/forgot-password", users.forgotPassword); 
//router.get("/reset-password/:id/:token", users.resetPasswordToken); 
router.patch("/reset-password/:token", users.resetPassword); 
// not using
router.post("/generateotp", users.generateOtp);

router.put("/updateuser", [verifyToken], users.updateUser);
router.get("/getprofile", [verifyToken], users.getProfile);

module.exports = router;
