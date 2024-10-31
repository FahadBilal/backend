import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import JWT from 'jsonwebtoken'

const generateAccessAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;

  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
  // get user detail
  // all fields are required
  // Username and email are already existed
  // created user
  // remove password and refreshToken
  // res

  const { username, fullName, email, password } = req.body;

  //console.log(username,fullName,email,password);

  if (
    [fullName, email, password, username].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(400, "Username and email are already existed");
  }

  const user = await User.create({
    fullName,
    email,
    password,
    username: username.toLowerCase(),
  });

  //console.log("User",user);

  const createdUser = await User.findOne(user._id).select("-password");

  if (!createdUser) {
    throw new ApiError(500, "Something went Wrong while registering a User");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User register Successfully!"));
});

const loginUser = asyncHandler(async (req, res) => {
  //get user info
  // check usename and email
  // user is existed
  // check the password
  // access and refresh token
  // send cookie

  const { username, email, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "Username and email are required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exit");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user crenditials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedIn = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    http: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedIn,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    }
  );
  const options = {
    http: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logout Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const inComingRefeshToken = req.cookies.refreshToken || req.body.refreshToken;

  if(!inComingRefeshToken){
    throw new ApiError(401,"Unauthorized Request")
  }

  const decodedToken = JWT.verify(inComingRefeshToken,process.env.REFRESH_TOKEN_SECRET)
  
try {
  
    const user = await User.findById(decodedToken?._id);
  
    if(!user){
      throw new ApiError(401,"Invalid Refresh Token")
    }
  
    if(inComingRefeshToken !== user.refreshToken){
      throw new ApiError(401,"Refresh Token is used and expired");
    }
  
    const {accessToken, newRefreshToken}= await generateAccessAndRefreshToken(user._id)
  
    const options={
      httpOnly:true,
      secure:true
    }
  
    return res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken",newRefreshToken, options)
    .json(
      ApiResponse(
        200,
        {accessToken, refreshToken:newRefreshToken},
        "Refreshed Access Token"
      )
    )
} catch (error) {
  throw new ApiError(401,error.message || "Invalid Refresh Token");
  
}

});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
