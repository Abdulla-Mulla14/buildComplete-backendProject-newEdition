import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { emailVerificationMailgenContent, forgotPasswordMailgenContent, sendEmail } from "../utils/mail.utils.js"
import jwt, { decode } from "jsonwebtoken"


const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken
    await user.save({validateBeforeSave: false})
    return { accessToken, refreshToken }
  } catch (error) {
    throw new ApiError(
      500, 
      "Something went wrong while generating access token",
    )
  }
}


const registerUser = asyncHandler(async (req, res) => {
  const {email, username, password, role} = req.body // take some data or recieving of data

  
  const checkingExistedUser = await User.findOne({
    $or: [{username}, {email}]
  }) // to check whether the user already exists in DB
  

  if (checkingExistedUser) {
    throw new ApiError(409, "User with email or username already exists", [])
  } // if the user already exists will throw an error 


  const savingUser = await User.create({
    email,
    password,
    username,
    isEmailVerified: false
  }) // saving the user

  const {unHashedToken, hashedToken, tokenExpiry} = savingUser.generateTemporaryToken()

  savingUser.emailVerificationToken = hashedToken;
  savingUser.emailVerificationExpiry = tokenExpiry;

  await savingUser.save({validateBeforeSave: false});

  
  
  // now I need to send an email so that the same token can be sent to the user itself
  await sendEmail({
    email: savingUser?.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      savingUser.username,
      `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}` // so this is what we are sending to the user and whenever he clicks on link this will be the url
    ),
  })

  
  // this is the response where we will eliminate some data which we don't want to send to the user
  const createdUser = await User.findById(savingUser._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry", // (-) + the field which want to be removed
  );

  if(!createdUser) {
    throw new ApiError(500, "Something went wrong while registering a user")
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        {user: createdUser},
        "User registered successfully and verification email has been sent on your email"
      )
    )
  
}) 

const login = asyncHandler(async(req, res) => {
  const {email, password, username} = req.body
  
  if(!email) {
    throw new ApiError(400, "Email is required")
  }

  const user = await User.findOne({email})

  if(!user) {
    throw new ApiError(400, "User does not exists")
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if(!isPasswordValid) {
    throw new ApiError(400, "Invalid credentials")
  }

  const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry", // (-) + the field which want to be removed
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken
        },
        "User logged in successfully"
      )
    )
  

});

const logoutUser = asyncHandler(async(req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    },
  );
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  }
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(200, {}, "User logged out")
    )
})

const getCurrentUser = asyncHandler(async(req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(
        200, 
        req.user,
        "Current user fetched successfully"
      )
    )
})

const verifyEmail = asyncHandler(async(req, res) => {
  const {VerificationToken} = req.params

  if(!VerificationToken) {
    throw new ApiError(400, "Email verification token is missing")
  }

  let hashedToken = crypto
    .createHash("sha256")
    .update(VerificationToken)
    .digest("hex")

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: {$gt: Date.now()}
    })

    if(!user) {
      throw new ApiError(400, "Token is invalid or expired")
    }

    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;

    user.isEmailVerified = true
    await user.save({validateBeforeSave: false})

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {
            isEmailVerified: true
          },
          "Email is verified"
        )
      )
})

const resendEmailVerification = asyncHandler(async(req, res) => {
  const user = await User.findById(req.user._id)

  if(!user) {
    throw new ApiError(404, "User does not exist")
  }
  if(user.isEmailVerified) {
    throw new ApiError(409, "Email is already verified")
  }

  const {unHashedToken, hashedToken, tokenExpiry} = savingUser.generateTemporaryToken()

  savingUser.emailVerificationToken = hashedToken;
  savingUser.emailVerificationExpiry = tokenExpiry;

  await savingUser.save({validateBeforeSave: false});

  await sendEmail({
    email: savingUser?.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      savingUser.username,
      `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}` // so this is what we are sending to the user and whenever he clicks on link this will be the url
    ),
  })

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Mail has been sent to your mail ID"
      )
    )
})

const refreshAccessToken = asyncHandler(async(req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized access")
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)

    if(!user) {
      throw new ApiError(401, "Invalid refresh token")
    }

    if(incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired")
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    }

    const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

    user.refreshToken = newRefreshToken;
    await user.save()

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken, refreshToken: newRefreshToken
          },
          "Access token refreshed"
        )
      )

  } catch (error) {
    throw new ApiError(401, "Invalid refresh token")
  }


})

const forgotPasswordRequest = asyncHandler(async(req, res) => {
  const {email} = req.body

  const user = await User.findOne({email})

  if(!user) {
    throw new ApiError(404, "User does not exists", [])
  }

  const {unHashedToken, hashedToken, tokenExpiry} = user.generateTemporaryToken()
    user.forgotPasswordRequest = hashedToken
    user.forgotPasswordExpiry = tokenExpiry 

    await user.save({validateBeforeSave: false})

    await sendEmail({
      email: savingUser?.email,
      subject: "Password reset request",
      mailgenContent: forgotPasswordMailgenContent(
      savingUser.username,
      `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}` 
      ),
    })

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "Password reset mail has been sent on you mail ID"
        )
      )
})

const resetForgotPassword = asyncHandler(async(req, res) => {
  const {resetToken} = req.params
  const {newPassword} = req.body

  let hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex")

    await User.findOne({
      forgotPasswordToken: hashedToken,
      forgotPasswordExpiry: {$gt: Date.now()}
    })

    if(!user) {
      throw new ApiError(489, "Token is invalid or expired")
    }

    user.forgotPasswordExpiry = undefined
    user.forgotPasswordToken = undefined

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "Password reset successfully"
        )
      )

})

const changeCurrentPassword = asyncHandler(async(req, res) => {
  const {oldPassword, newPassword} = req.body

  const user = await User.findById(req.user?._id)

  const isPasswordvalid = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordvalid) {
    throw new ApiError(400, "Invalid old password")
  }

  user.password = newPassword
  await user.save({validateBeforeSave: false})

  return res 
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password changed successfully"
      )
    )
})


export { 
  registerUser, 
  login, 
  logoutUser, 
  getCurrentUser, 
  verifyEmail,
  resendEmailVerification, 
  refreshAccessToken,
  forgotPasswordRequest,
  resetForgotPassword,
  changeCurrentPassword
};