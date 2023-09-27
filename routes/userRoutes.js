const express = require("express");
const users = require("../controllers/userControlles");
const router = express.Router();
const verifyToken = require("../middlewares/auth");

router.post("/signup", users.signUp);
router.post("/login", users.login);
router.post("/verifyotp", users.verifyOtp);
router.post("/reset-password", users.resetPassword); 
router.get("/reset-password/:id/:token", users.resetPasswordToken); 
router.post("/reset-password/:id/:token", users.updatePassword); 
// not using
router.post("/generateotp", users.generateOtp);

router.put("/updateuser", [verifyToken], users.updateUser);
router.get("/getprofile", [verifyToken], users.getProfile);

module.exports = router;
