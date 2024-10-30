import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import { User } from '../models/user.model.js';
import {ApiResponse} from '../utils/ApiResponse.js'


const registerUser = asyncHandler( async (req,res) => {
    // get user detail
    // all fields are required
    // Username and email are already existed
    // created user 
    // remove password and refreshToken
    // res


    const {username, fullName, email, password} =req.body;

    //console.log(username,fullName,email,password);

    if (
        [fullName,email,password,username].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required");
    }

    const existedUser = await User.findOne(
        {
            $or:[{username},{email}]
        }
    )
    if(existedUser){
        throw new ApiError(400,"Username and email are already existed");
    }

    const user = await User.create({
        fullName,
        email,
        password,
        username:username.toLowerCase(),
    })

    console.log("User",user);
    

    const createdUser = await User.findOne(user._id).select(
        "-password"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went Wrong while registering a User")
    }

    return res.status(201).json(
        new ApiResponse(
            200,
            createdUser,
            "User register Successfully!"
        )
    )

    
} )



export {
    registerUser,
}