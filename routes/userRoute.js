const BASE_URL = "http://localhost:5173";
import express from "express";
import bcrypt from "bcrypt";
import {
  activateAccount,
  activationMail,
  addUser,
  forgotPassword,
  generateActivationToken,
  generateToken,
  generateUserToken,
  getUser,
  getUserById,
  resetPassword,
} from "../controllers/userController.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

//1
// add new user - with email, username, password
router.post("/signup", async (req, res) => {
  try {
    // hashing user password
    //console.log("adding user");
    const salt = await bcrypt.genSalt(10);
    const user = await getUser({ email: req.body.email });
    // validating if user already exists
    if (!user) {
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      const activationKey = Math.random().toString(36).substring(2, 9);
      const hashedUser = await {
        ...req.body,
        password: hashedPassword,
        isActivated: false,
        activationKey: activationKey,
      };
      const result = await addUser(hashedUser);

      // generate token to activate account
      const secret = activationKey;
      const token = generateActivationToken(hashedUser._id, secret);
      //console.log("token:" + token);

      const link = `${BASE_URL}/activate/${hashedUser._id}?activateToken=${token}`;
      const mailOptions = {
        from: process.env.EMAIL_USERNAME,
        to: hashedUser.email,
        subject: "Account Activation Link sent",
        text: `Click on the below link to activate your account. This link is valid for 48 hours after which link will be invalid. ${link}`,
      };

      // Checking mongodb acknowledgement
      if (!result.acknowledged) {
        return res
          .status(404)
          .json({ message: "Error uploading user information" });
      } else {
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            //console.log("Email not sent", error);
            return res.status(400).send({
              message: "Error sending email",
              result: result.acknowledged,
            });
          } else {
            //console.log("Email sent: " + info.response);
            return res.status(200).send({
              result: result.acknowledged,
              message: "Activation link sent",
              data: hashedUser.email,
            });
          }
        });
      }
    } else {
      return res.status(400).json({ message: "Email already exist" });
    }
  } catch (error) {
    //console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//2
// verifying activation
router.post("/activate/:id/:token", async (req, res) => {
  try {
    //console.log("Activating account");
    const { id, token } = req.params;
    if (!id) {
      return res.status(404).json({ message: "User does not exist" });
    }
    if (!token) {
      return res.status(404).json({ message: "Invalid authorization" });
    }

    const user = await getUserById(id);
    if (!user) {
      return res
        .status(404)
        .json({ message: "Invalid link, please try the process again" });
    }

    const secret = user.activationKey;
    if (!secret) {
      return res
        .status(400)
        .json({ message: "No activation key found for the user" });
    }

    try {
      const decoded = jwt.verify(token, secret);
      //console.log("Decoded token:", decoded);

      if (decoded.id === id) {
        const result = await activateAccount(user.email, {
          isActivated: true,
          activationKey: "",
        });

        if (result.modifiedCount === 0) {
          return res.status(400).json({ message: "Error activating account" });
        }

        //console.log("Account activated");
        return res.status(200).json({
          message: "Account activated",
          decoded,
        });
      } else {
        return res
          .status(400)
          .json({ message: "Token does not match user ID" });
      }
    } catch (err) {
      //console.log("JWT verification error:", err);
      return res.status(400).json({ message: "Token error", error: err });
    }
  } catch (err) {
    //console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

//3
// Re-send Activation Email
router.post("/activation", async (req, res) => {
  try {
    // hashing user password
    //console.log("resend activation email");
    const user = await getUser({ email: req.body.email });
    // validating if user already exists
    if (!user) {
      return res.status(400).json({ message: "User not registered" });
    }
    if (!user.isActivated) {
      const activationKey = Math.random().toString(36).substring(2, 9);
      const result = await activationMail(req.body.email, {
        isActivated: false,
        activationKey: activationKey,
      });

      // generate token to activate account
      const secret = activationKey;
      const token = generateActivationToken(user._id, secret);

      const link = `${BASE_URL}/activate/${user._id}?activateToken=${token}`;
      const mailOptions = {
        from: process.env.EMAIL_USERNAME,
        to: user.email,
        subject: "Account Activation Link sent",
        text: `Click on the below link to activate your account. This link is valid for 48 hours after which link will be invalid. ${link}`,
      };
      // checking mongodb acknowledgement
      if (result.modifiedCount === 0) {
        return res
          .status(404)
          .json({ message: "Error sending activation mail" });
      } else {
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            //console.log("Email not sent", error);
            return res.status(400).send({
              message: "Error sending email",
              result: result.modifiedCount,
            });
          } else {
            //console.log("Email sent: " + info.response);
            return res.status(200).send({
              result: result.modifiedCount,
              message: "Activation link sent",
              data: user.email,
            });
          }
        });
      }
    } else {
      return res
        .status(400)
        .json({ message: `Account already activated ${user.isActivated}` });
    }
  } catch (error) {
    //console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//4
// forgot password request, creates temporary token and emails reset link
router.post("/forgot-password", async (req, res) => {
  try {
    //user exist validations
    const user = await getUser(req.body);
    if (!user) {
      return res.status(404).json({ message: "Email not registered" });
    }
    if (!user.isActivated) {
      return res.status(404).json({ message: "Account not activated" });
    }

    const secret = Math.random().toString(36).substring(2, 11);
    const token = generateToken(user._id, secret);

    const link = `${BASE_URL}/authorize/?id=${user._id}&token=${token}`;
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: user.email,
      subject: "Password reset link sent",
      text: `Click on the below link to reset your password. This password reset link is valid for 10 minutes after which link will be invalid. ${link}`,
    };
    const result = await forgotPassword(user.email, { password: secret });
    if (result.modifiedCount === 0) {
      return res.status(400).json({ message: "Error setting verification" });
    } else {
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          //console.log("Email not sent", error);
          res.status(400).send({
            message: "Error sending email",
            reset: result.modifiedCount === 0,
          });
        } else {
          //console.log("Email sent: " + info.response);
          res.status(200).send({ result: result.modifiedCount !== 0 });
        }
      });
    }
  } catch (error) {
    //console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//5
// verifying and authorizing token to allow reset password
router.get("/forgot-password/authorize/:id/:token", async (req, res) => {
  try {
    const { id, token } = req.params;
    //console.log("verifying token");
    if (!id) {
      return res.status(404).json({ message: "User does not exist" });
    }
    if (!token) {
      return res.status(404).json({ message: "Invalid authorization" });
    }
    const user = await getUserById(id);
    if (!user) {
      return res
        .status(404)
        .json({ message: "Invalid link, please try the process again" });
    }
    try {
      const decode = jwt.verify(token, user.password);
      if (decode.id) {
        return res
          .status(200)
          .json({ message: "Token verified", decode: decode });
      }
    } catch (err) {
      //console.log(err);
      res.status(500).json({ message: "Token error", error: err });
    }
  } catch (err) {
    //console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//6
// Resetting password in DB
router.post("/reset-password/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ message: "Invalid or expired link" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    const result = await resetPassword(id, { password: hashedPassword });

    if (!result || result.modifiedCount === 0) {
      return res.status(400).json({ message: "Error resetting password" });
    }

    res
      .status(200)
      .json({ message: "Password reset successfully", user: user });
  } catch (err) {
    //console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//7
// Login to user account
router.post("/login", async (req, res) => {
  try {
    //console.log("user login..");
    //user exist validation
    const user = await getUser({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: "Invalid Email" });
    }
    if (!user.isActivated) {
      return res.status(404).json({ message: "Account not activated" });
    }
    // validating password
    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid Password" });
    }
    const token = generateUserToken(user._id, process.env.SECRET_KEY);
    res.status(200).json({
      data: {
        fname: user.fname,
        lname: user.lname,
        email: user.email,
        id: user._id,
      },
      token: token,
    });
  } catch (error) {
    //console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export const userRouter = router;
