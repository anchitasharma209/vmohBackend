const mongoose = require("mongoose");
const crypto = require("crypto");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    companyName: { type: String, required: true },
    email: { type: String, required: true, unique: true ,lowercase:true,
    validate:[validator.isEmail,"Please enter a valid email."]},
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String,required:true, minLength: 8 ,select:false},
    confirmPassword: { type: String ,
    validate:{
      validator:function(val){
        return val == this.password;
      },
      message:'Password and confirm password does not match'
    }
    },
    passwordResetToken:String,
    passwordResetTokenExpires:Date,
    otp: { type: String },
    otpExpiration: { type: Date },
    status: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    
  },
  { timestamps: true }
);
userSchema.pre('save',async function(next){
  if(!this.isModified('password')) return next();

  //encrypt the password before saving it
  this.password = await bcrypt.hash(this.password,12);

  this.confirmPassword = undefined;
  next();
})
userSchema.methods.comparePasswordInDB = async function(pswd,pswdDB){
 return await bcrypt.compare(pswd,pswdDB);
}

userSchema.methods.createResetPasswordToken = function(){
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken=crypto.createHash("sha256").update(resetToken).digest("hex");
  this.passwordResetTokenExpires = Date.now() + 10*60*1000;
  console.log(resetToken,this.passwordResetToken);

  return resetToken;
}
const Users = mongoose.model("User", userSchema);

module.exports = Users;
