const User = require("../models/User")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

const generateToken = (userId) => {
    return jwt.sign({id: userId}, process.env.JWT_SECRET, {expiresIn: "7d"})
}


// Register User - api/auth/register - Put
const registerUser = async (req, res) => {
    try{
        const {name, email, password, profileImageUrl, adminInviteToken} = req.body;

        const UserExists = await User.findOne({email});
        if(UserExists){
            return res.status(400).json({message: "User already exists"})
        }
        
        let role = "member";
        if(adminInviteToken && adminInviteToken === process.env.ADMIN_INVITE_TOKEN){
            role = "admin";
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            profileImageUrl,
            role
        })

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profileImageUrl: user.profileImageUrl,
            role: user.role,
            token: generateToken(user._id)
        })

    }catch (error){
        res.status(500).json({message: "Internal Server Error", error: error.message    })
    }
}

// Login User - api/auth/login - Put
const loginUser = async (req, res) => {
    try{
        const {email, password} = req.body;
        const user = await User.findOne({email});
        if(!user){
            return res.status(401).json({message: "Invalid credentials"})
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if(!isMatch){
            return res.status(401).json({message: "Invalid Password"})
        }

        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profileImageUrl: user.profileImageUrl,
            role: user.role,
            token: generateToken(user._id)
        })

    }catch (error){
        res.status(500).json({message: "Internal Server Error", error: error.message})
    }
}

// Get User Profile - api/auth/profile - Put
const getUserProfile = async (req, res) => {
    try{
        const user = await User.findById(req.user.id).select("-password")
        if(!user){
            return res.status(404).json({message: "User not found"})
        }
        res.status(200).json(user)

    }catch (error){
        res.status(500).json({message: "Internal Server Error", error: error.message})
    }
}

// Update User Profile - api/auth/profile - Put
const updateUserProfile = async (req, res) => {
    try{
        const user = await User.findById(req.user.id)
        if(!user){
            return res.status(404).json({message: "User not found"})
        }

        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.profileImageUrl = req.body.profileImageUrl || user.profileImageUrl;

        if(req.body.password){
            const salt = await bcrypt.genSalt(10)
            user.password = await bcrypt.hash(req.body.password,salt)
        }

        const updatedUser = await user.save()

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            profileImageUrl: updatedUser.profileImageUrl,
            role: updatedUser.role,
            token: generateToken(updatedUser._id)
        })

    }catch (error){
        res.status(500).json({message: "Internal Server Error", error: error.message})
    }
}


module.exports = { registerUser, loginUser, getUserProfile, updateUserProfile }