const Users = require("../models/userModel");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const moment = require("moment");
const secretKey =
  "eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTY5NTQ1OTAyMiwiaWF0IjoxNjk1NDU5MDIyfQ.AV9LAkze8oxNJR9yv4oHb2geqvne4a6aKoHTXXxpl1g";
const { generateOTP } = require("../utils/otp");
const { sendSMS } = require("../utils/sms");
const sendEmail = require("./../utils/email");
const crypto = require("crypto");
const path = require("path");

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
      isVerfied: false,
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
    user.isVerfied = true;
    await user.save();

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
    return res.status(200).json({
      status: true,
      message: "OTP verified successfully.",
      token,
      isVerfied: user.isVerfied,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

// Login API with username AS phone number and matching password from Database
exports.login = async (req, res) => {
  // const { credential, password } = req.body;

  // // Checking if credential provided in body is email format or not
  // const isEmail = /^\S+@\S+\.\S+$/.test(credential);
  // try {
  //   let user;

  //   // Finding user based on email or phoneNumber
  //   if (isEmail) {
  //     user = await Users.findOne({ email: credential });
  //   } else {
  //     user = await Users.findOne({ phoneNumber: credential });
  //   }
  //   //const isMatch = await user.comparePasswordInDB(password,user.password)

  //   // Check if a user with the provided email or phoneNumber exists
  //   if (!user || !(await user.comparePasswordInDB(password,user.password))) {
  //     return res.status(404).json({
  //       status: false,
  //       message: "User not found.",
  //     });
  //   }

  //   // Password matching
  //   if (user.password !== password) {
  //     return res.status(401).send({
  //       status: false,
  //       message: "Invalid password",
  //     });
  //   }

  //   // Generate and send JWT token
  //   const token = jwt.sign(
  //     {
  //       id: user._id,
  //       companyName: user.companyName,
  //       phoneNumber: user.phoneNumber,
  //     },
  //     secretKey,
  //     { expiresIn: "2h" }
  //   );
  //   return res.status(200).send({
  //     status: true,
  //     ,message: "Login successful"
  //     data: {
  //       firstName: user.firstName,
  //       lastName: user.lastName,
  //       email: user.email,
  //       phoneNumber: user.phoneNumber,
  //       companyName: user.companyName,
  //     },
  //     token,
  //   });
  // } catch (err) {
  //   return res.status(500).json({
  //     status: false,
  //     message: err.message,
  //   });
  // }
  const email = req.body.email;
  const password = req.body.password;

  //check if phone number and password present in request body
  if (!email || !password) {
    return res.status(400).json({
      status: false,
      message: "Please provide email and password for login",
    });
  }

  //checkif user exist with given phone number
  const user = await Users.findOne({ email }).select("+password");
  if (!user) {
    return res.status(400).json({
      status: "false",
      message: "No User Found",
    });
  }
  if (!user.status) {
    const otp = generateOTP();
    const otpExpiration = moment().add(5, "minutes").toDate();
    const message = `Your OTP for Verificaion is ${otp} and this is valid for 5 minutes`;
    sendSMS(user.phoneNumber, message);
    console.log(
      `OTP for verify User At the login time if he is not Verfied ${otp}`
    );
    user.otp = otp;
    user.otpExpiration = otpExpiration;
    await user.save();
    return res.status(400).json({
      status: "false",
      message: "Phone Number Not Verified",
      phoneNumber: user.phoneNumber,
    });
  }
  await user.comparePasswordInDB(password, user.password);
  //check if user exist & pasword matches
  if (!user || !(await user.comparePasswordInDB(password, user.password))) {
    return res.status(400).json({
      status: "false",
      message: "Incorrect email or password",
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

  res.status(200).json({
    status: "success",
    message: "Login successful",
    isVerfied: user.isVerfied,
    token,
  });
};

// Reseting password by phoneNumber (NOT WOKRING)
exports.resetPasswordss = async (req, res) => {
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

// Update Password after matching OTP that is sent at the time of passwrod resetting(NOT WORKING)
exports.updatePasswordsss = (req, res) => {
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

    // Check if req.files exists (file upload)
    if (req.files && req.files.profilePicture) {
      const uploadedFile = req.files.profilePicture;
      const extension = path.extname(uploadedFile.name);
      const file_name = "profile-" + Date.now() + extension;
      const uploadPath = "./images/" + file_name; // Corrected path

      uploadedFile.mv(uploadPath, async function (err) {
        if (err) {
          return res.status(500).json({
            status: false,
            message: err.message,
          });
        }

        // Update the user document with profilePicture file_name
        try {
          const updatedUser = await Users.findOneAndUpdate(
            { _id: userId },
            { ...req.body, profilePicture: file_name },
            { new: true } // To return the updated document
          );

          if (!updatedUser) {
            return res.status(404).json({
              status: false,
              message: "User not found",
            });
          }

          res.status(200).json({
            status: true,
            message: "UserDetails updated successfully",
            data: updatedUser,
          });
        } catch (updateError) {
          console.error(updateError);
          return res.status(500).json({
            status: false,
            message: "Internal server error",
          });
        }
      });
    } else {
      // No file upload, directly update user details without profilePicture
      try {
        const updatedUser = await Users.findOneAndUpdate(
          { _id: userId },
          req.body,
          { new: true } // To return the updated document
        );

        if (!updatedUser) {
          return res.status(404).json({
            status: false,
            message: "User not found",
          });
        }

        res.status(200).json({
          status: true,
          message: "UserDetails updated successfully",
          data: updatedUser,
        });
      } catch (updateError) {
        console.error(updateError);
        return res.status(500).json({
          status: false,
          message: "Internal server error",
        });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
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
    const alreadyUser = await Users.findOne({ phoneNumber: phoneNumber });
    if (!alreadyUser) {
      return res.status(500).json({
        status: false,
        message: "Error While Sending OTP",
      });
    }
    const otp = generateOTP();
    const otpExpiration = moment().add(5, "minutes").toDate();
    const message = `Your OTP for Reset Password is ${otp} and this is valid for 5 minutes`;
    sendSMS(phoneNumber, message);
    alreadyUser.otp = otp;
    alreadyUser.otpExpiration = otpExpiration;
    await alreadyUser.save();
    console.log(`OTP for Testing Resend OTP is ${otp} , 5 mins valid`);

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

    Users.findOne(
      { _id: user.id },
      { password: 0, otp: 0, otpExpiration: 0, confirmPassword: 0 }
    ).then((data) => {
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

// Reset Password API which sends link to the user email address.
// exports.resetPassword = (req, res) => {
//   try {
//     const email = req.body.email;
//     Users.findOne({ email: email })
//       .then((user) => {
//         if (!user) {
//           return res.status(404).send({
//             status: false,
//             message: "User not found",
//           });
//         }
//         const token = jwt.sign({ _id: user._id, email }, secretKey, {
//           expiresIn: "10m",
//         });

//         // save user token
//         var link = `${req.protocol}://${req.get("host")}/api/v1/reset-password/${user._id}/${token}`;
//         const textHtml = `Click <a href = ${link}> Here </a> to reset your password ,If it doesn't work then click on the side link <br> ${link}`;
//         const textMsg = `Or click on the side link to reset your password ${link}`;
//         console.log(link);
//         // sending email code
//         var mailOptions = {
//           email: `${email}`,
//           subject: "VMOH - Reset password",
//           textHtml: textHtml,
//           message: textMsg,
//         };
//         sendEmail(mailOptions, function (error, info) {
//           if (error) {
//             console.log(error);
//           } else {
//             console.log("Email sent: " + info.response);
//           }
//         });

//         return res.status(200).send({
//           status: true,
//           message: "Please check your email and reset password.",
//           token: token,
//         });
//       })
//       .catch((err) => {
//         return res.status(500).send({
//           status: false,
//           message: err.message,
//         });
//       });
//   } catch (err) {
//     return res.status(500).send({
//       status: false,
//       message: "Catch Exception -" + err.message,
//     });
//   }
// };

exports.resetPasswordToken = async (req, res) => {
  const { token, id } = req.params;

  const oldUser = await Users.findOne({ _id: id });
  if (!oldUser) {
    return res.status(401).send({
      status: false,
      message: "No user Exists",
    });
  }
  try {
    const verify = jwt.verify(token, secretKey);
    if (!verify) {
      return res.status(401).send({
        status: false,
        message: "Not authorized",
      });
    } else {
      res.render("index", { email: verify.email });
    }
  } catch (err) {
    return res.status(500).send({
      status: false,
      message: err.message,
    });
  }
};

exports.updatePassword = async (req, res) => {
  const { id, token } = req.params;
  const { password, confirmPassword } = req.body;
  if (!password) {
    return res.status(401).send({
      status: false,
      message: "Password Should not Empty",
    });
  }

  const oldUser = await Users.findOne({ _id: id });
  if (password === oldUser.password) {
    return res.status(401).send({
      status: false,
      message: "Password Should not be same as old Password",
    });
  }
  try {
    const verify = jwt.verify(token, secretKey);

    if (!verify) {
      return res.status(401).send({
        status: false,
        message: "Not authorized",
      });
    } else {
      const updatedUser = await Users.updateOne(
        { _id: id },
        { $set: { password: password } }
      );
      if (updatedUser.modifiedCount === 0) {
        return res.status(404).send({
          status: false,
          message: "Error Changing Password",
        });
      } else {
        res.render("passwordUpdated", { email: verify.email });
      }
    }
  } catch (err) {
    return res.status(500).send({
      status: false,
      message: err.message,
    });
  }
};

// reseting password
exports.forgotPassword = async (req, res, next) => {
  //1 get user based on posted email
  const user = await Users.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).send({
      message: "User Not Found",
    });
  }
  //2 create a random reset token
  const resetToken = user.createResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  //3 send the token back to user email
  //const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/reset-password/${resetToken}`
  const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
  const message = `Please use the below link to reset your password\n\n${resetUrl}\n\nThis reset Password link will be valid for 10 minutes`;
  //console.log(message);
  try {
    await sendEmail({
      email: user.email,
      subject: "Password changes request recieved",
      message: message,
    });

    res.status(200).json({
      status: "Success",
      message: "Password reset link send to user email",
      user,
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    user.save({ validateBeforeSave: false });

    return res.status(500).send({
      message: "There was an error sending message",
    });
  }
};

exports.resetPassword = async (req, res) => {
  const token = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await Users.findOne({
    passwordResetToken: token,
    passwordResetTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).send({
      message: "Token is invalid or has expired",
    });
  }
  //resetting the password
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  // Clear reset token fields
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpires = undefined;

  user.save();
  // login the user
  const loginToken = jwt.sign(
    {
      id: user._id,
      companyName: user.companyName,
      phoneNumber: user.phoneNumber,
    },
    secretKey,
    { expiresIn: "2h" }
  );
  return res.status(200).send({
    status: "true",
    message: "Password reset Successfully",
    token: loginToken,
  });
};

exports.resetPasswordTokens = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const oldUser = await Users.findOne({ _id: id });
  if (!oldUser) {
    return res.status(401).send({
      status: false,
      message: "No user Exists",
    });
  }
  try {
    const verify = jwt.verify(token, secretKey);
    if (!verify) {
      return res.status(401).send({
        status: false,
        message: "Not authorized",
      });
    } else {
      res.render("index", { email: verify.email });
    }
  } catch (err) {
    return res.status(500).send({
      status: false,
      message: err.message,
    });
  }
};
