import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

  generateAccessAndRefreshToken(user._id);

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
        },
        "User logged In Successfully"
      )
    );
});

export { registerUser, loginUser };
