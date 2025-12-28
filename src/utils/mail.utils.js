import Mailgen from "mailgen"
import nodemailer from "nodemailer"

// branding the email to send and sending it
const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Task Manager",
      link: "https://taskmanagelink.com",
    },
  });

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent); // So it will automatically pick the textual content, if it doesn't support html
  const emailHTML = mailGenerator.generate(options.mailgenContent); // this if the browser supports the html

  // this is the tranporter of the email
  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    PORT: process.env.MAILTRAP_SMTP_PORT,
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASS,
    },
  });

  const mail = {
    from: "mail.taskmanger@gmail.com",
    to: options.email, // this is reciever's email
    subject: options.subject,
    text: emailTextual, // So it will automatically pick the textual content, if it doesn't support html
    html: emailHTML, // this if the browser supports the html
  };

  // will wrap everything in try catch coz email has tendancy to fail
  try {
    await transporter.sendMail(mail)
  } catch (error) {
    console.error("Email service failed silently. Make sure that you have provided your MAILTRAP credentials in the .env file")
    console.error("Error:", error)
  }
}


// verification email. generating of content for email
const emailVerificationMailgenContent = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to our App! we're excited to have you on board.",
      action: {
        instructions: "To verify your email please click on following button",
        button: {
          color: "#22BC66",
          text: "Verify your email",
          link: verificationUrl
        },
      },
      outro: "Need help, or have questions? Just reply to this email, we'd love to help."
    },
  };
}

// forgot password. generating of content for forgot password`
const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "We got a request to reset the password of your account.",
      action: {
        instructions: "To reset your password click on the following button or link",
        button: {
          color: "#22BC66",
          text: "Reset password",
          link: passwordResetUrl
        },
      },
      outro: "Need help, or have questions? Just reply to this email, we'd love to help."
    },
  };
}


export {
  emailVerificationMailgenContent, 
  forgotPasswordMailgenContent,
  sendEmail
}