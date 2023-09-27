const mongoose = require("mongoose");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    companyName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    confirmPassword: { type: String },
    otp: { type: String },
    otpExpiration: { type: Date },
    status: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.methods.createResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(64).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetTokenExpired = Date.now() + 10 * 60 * 1000;
  console.log(resetToken, this.passwordResetToken);

  return resetToken;
};
const Users = mongoose.model("User", userSchema);

module.exports = Users;
