const Task = require("../models/Task");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Get all users - /api/users - GET - Admin Only
const getUsers = async (req, res) => {
    try{
        const users = await User.find({role: "member"}).select("-password");

        // Add tasks count to each user
        const usersWithTasksCount = await Promise.all(users.map(async (user) => {
                const pendingTasks = await Task.countDocuments({assignedTo: user._id, status: "Pending"});
                const inProgressTasks = await Task.countDocuments({assignedTo: user._id, status: "In Progress"});
                const completedTasks = await Task.countDocuments({assignedTo: user._id, status: "Completed"});

                return{
                    ...user._doc,
                    pendingTasks,
                    inProgressTasks,
                    completedTasks
                }
        }));

        res.status(200).json(usersWithTasksCount);
    } catch(error){
        res.status(500).json({message: "Server error", error: error.message});
    }
} 

// Get user by ID - /api/users/:id - GET 
const getUserById = async (req, res) => {
    try{
        const user = await User.findById(req.params.id).select("-password");
        if(!user){
            return res.status(404).json({message: "User not found"});
        }
        res.status(200).json(user);        
    } catch(error){
        res.status(500).json({message: "Server error", error: error.message});
    }
}

// Delete user - /api/users/:id - DELETE - Admin Only
const deleteUser = async (req, res) => {
    try{
        const user = await User.findByIdAndDelete(req.params.id);
        if(!user){
            return res.status(404).json({message: "User not found"});
        }
        res.status(200).json(user);
    } catch(error){
        res.status(500).json({message: "Server error", error: error.message});
    }
}


module.exports = { getUsers, getUserById, deleteUser }
