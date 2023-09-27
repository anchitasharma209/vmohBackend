const nodemailer = require("nodemailer");
const sendEmail = async (option) => {
  //create a transporter
  const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "f94c8292997a1e",
      pass: "baa8241d6885a9",
    },
  });
  // transporter.verify((err, success) => {
  //     if (err) console.error(err);
  //     console.log('Your config is correct');
  // });

  const emailOptions = {
    from: "abc@example.com",
    to: option.email,
    subject: option.subject,
    html: option.textHtml,
    text: option.message,
  };
  await transporter.sendMail(emailOptions, function (err, info) {
    if (err) {
      console.log(err);
      return;
    }
    console.log(info.response);
  });
};
module.exports = sendEmail;
