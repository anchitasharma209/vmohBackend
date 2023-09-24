const Users = require("../models/userModel");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const moment = require("moment");
const secretKey =
  "eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTY5NTQ1OTAyMiwiaWF0IjoxNjk1NDU5MDIyfQ.AV9LAkze8oxNJR9yv4oHb2geqvne4a6aKoHTXXxpl1g";
const { generateOTP } = require("../utils/otp");
const { sendSMS } = require("../utils/sms");

// SIGN UP API creating new users
exports.signUp = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    companyName,
    phoneNumber,
    password,
    confirmPassword,
  } = req.body;
  // Validate request
  if (
    !firstName ||
    !lastName ||
    !companyName ||
    !email ||
    !phoneNumber ||
    !password ||
    !confirmPassword
  ) {
    res.status(400).send({
      status: false,
      message: "All fields are required",
    });
    return;
  }

  try {
    // Check if the user already exists
    let user = await Users.findOne({ phoneNumber });
    if (user) {
      return res.status(400).send({
        status: false,
        message: "Phone number already exists",
      });
    }
    let userEmail = await Users.findOne({ email });
    if (userEmail) {
      return res.status(400).send({
        status: false,
        message: "Email already exists!",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiration = moment().add(5, "minutes").toDate(); // 5 minutes timer

    // Save user details and OTP to the database
    user = new Users({
      firstName,
      lastName,
      email,
      companyName,
      phoneNumber,
      password,
      otp,
      otpExpiration,
      status: false,
    });
    await user.save();

    // Send OTP to the user's phone number
    const message = `Your OTP for sign-up is ${otp} and this is valid for 5 minutes`;
    sendSMS(phoneNumber, message);
    console.log(message);
    return res.status(200).send({
      status: true,
      message: "OTP has been sent. Please verify your Number!",
      data: user,
    });
  } catch (err) {
    return res.status(500).send({
      status: false,
      message: err.message,
    });
  }
};

// API To verrify OTP
exports.verifyOtp = async (req, res) => {
  const { phoneNumber, otp } = req.body;
  try {
    // Find the user by phone number
    const user = await Users.findOne({ phoneNumber: phoneNumber });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // Check if otp matches
    if (user.otp !== otp) {
      return res.status(400).json({
        status: false,
        message: "Invalid OTP",
      });
    }

    // Check if the otp time has expired
    const otpTimestamp = moment(user.otpExpiration);
    const currentTime = moment();
    const otpValidityDuration = moment.duration(currentTime.diff(otpTimestamp));
    if (otpValidityDuration.asMinutes() > 5) {
      return res.status(400).json({
        status: false,
        message: "OTP has expired",
      });
    }
    // OTP verified successfully, update the user document
    user.otp = "";
    user.status = true;
    await user.save();

    return res.status(200).json({
      status: true,
      message: "OTP verified successfully.",
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

// Login API with username AS phone number and matching password from Database
exports.login = (req, res) => {
  const { phoneNumber, password } = req.body;

  Users.findOne({ phoneNumber })
    .then((user) => {
      if (!user) {
        return res.status(404).send({
          status: false,
          message: "User not found",
        });
      }

      if (user.password !== password) {
        return res.status(401).send({
          status: false,
          message: "Invalid password",
        });
      }

      // Generate and send JWT token
      const token = jwt.sign(
        {
          id: user._id,
          companyName: user.companyName,
          phoneNumber: user.phoneNumber,
        },
        secretKey,
        { expiresIn: "2h" }
      );
      return res.status(200).send({
        status: true,
        message: "Login successful",
        data: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          companyName: user.companyName,
        },
        token,
      });
    })
    .catch((err) => {
      return res.status(500).send({
        status: false,
        message: err.message,
      });
    });
};

// reseting password by phoneNumber
exports.resetPassword = async (req, res) => {
  const phoneNumber = req.body.phoneNumber;

  const user = await Users.findOne({ phoneNumber: phoneNumber });
  if (!user) {
    return res.status(404).json({
      status: false,
      message: "User not found",
    });
  }

  const otp = generateOTP();

  // Send OTP to the user's phone number
  const message = `Your OTP for Reset Password is ${otp} and this is valid for 5 minutes`;
  sendSMS(phoneNumber, message);
  return res.status(200).send({
    status: true,
    message: "OTP has been sent for reset password",
    phoneNumber,
  });
};

// Update Password after matching OTP that is sent at the time of passwrod resetting
exports.updatePassword = (req, res) => {
  const phoneNumber = req.body.phoneNumber;
  Users.updateOne(
    { phoneNumber: phoneNumber },
    {
      $set: {
        password: password,
        confirmPassword: confirmPassword,
      },
    },
    { new: true }
  )
    .then((user) => {
      if (!user) {
        return res.status(404).send({
          status: false,
          message: `User not found with id ${phoneNumber}`,
        });
      }
      return res.status(200).send({
        status: true,
        message: "Password updated successfully!",
        data: user,
      });
    })
    .catch((err) => {
      return res.status(500).send({
        status: false,
        message: err.message,
      });
    });
};

/*  Updating user details
 */
exports.updateUser = async (req, res) => {
  try {
    const userId = req.decoded.id;

    const { firstName, lastName, companyName } = req.body;
    // Create an object with the fields to update
    const updateFields = {};
    if (firstName) {
      updateFields.firstName = firstName;
    }
    if (lastName) {
      updateFields.lastName = lastName;
    }
    if (companyName) {
      updateFields.companyName = companyName;
    }
    // Use the _id filter to update the document
    const updatedUser = await Users.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: updateFields }
    );

    if (updatedUser.nModified === 0) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      status: true,
      message: "UserDetails  updated successfully",
      data: updatedUser,
    });
  } catch (err) {
    return res.status(500).send({
      status: false,
      message: err.message,
    });
  }
};

// API for Generating random 6 digits OTP (NOT USING NOW)
exports.generateOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { phoneNumber } = req.body;
  try {
    const otp = generateOTP();
    const message = `Your OTP for resetting the password is ${otp}`;
    sendSMS(phoneNumber, message);

    return res.status(200).json({
      status: true,
      message: "OTP sent to the user",
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.getProfile = (req, res) => {
  try {
    const user = req.decoded;

    Users.findOne({ _id: user.id }).then((data) => {
      if (!data) {
        return res.status(404).json({
          status: false,
          message: "No profile found",
        });
      } else {
        return res.status(200).json({
          status: true,
          message: "Getting profile successfully",
          data: data,
        });
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};
